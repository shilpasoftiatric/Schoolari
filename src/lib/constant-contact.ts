import { createClient } from "@supabase/supabase-js";

export const CONSTANT_CONTACT_PARENT_LIST = process.env.CONSTANT_CONTACT_PARENT_LIST || "cdff2514-7ebe-11f1-a371-02420a320002";
export const CONSTANT_CONTACT_STUDENT_LIST = process.env.CONSTANT_CONTACT_STUDENT_LIST || "fdcd3218-7ebe-11f1-94bb-02420a320003";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function refreshConstantContactToken(refreshToken: string, clientId: string, clientSecret: string) {
  try {
    const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encodedCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.error("Failed to refresh CC token", await res.text());
      return null;
    }

    const data = await res.json();
    
    // Save new tokens to DB
    await supabase.from("site_settings").update({
      cc_access_token: data.access_token,
      cc_refresh_token: data.refresh_token,
    }).neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows (usually just 1 row)

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing CC token", error);
    return null;
  }
}

async function getValidAccessToken(forceRefresh = false) {
  // If an access token is provided directly and we don't want to manage refresh, use it.
  if (process.env.CONSTANT_CONTACT_ACCESS_TOKEN) {
    return process.env.CONSTANT_CONTACT_ACCESS_TOKEN;
  }

  // 1. Fetch tokens from DB
  const { data: settings } = await supabase
    .from("site_settings")
    .select("cc_access_token, cc_refresh_token")
    .limit(1)
    .single();

  let accessToken = settings?.cc_access_token;
  let refreshToken = settings?.cc_refresh_token;

  // Fallback to .env for initial setup if DB is empty
  if (!refreshToken && process.env.CONSTANT_CONTACT_REFRESH_TOKEN) {
    refreshToken = process.env.CONSTANT_CONTACT_REFRESH_TOKEN;
  }

  const clientId = process.env.CONSTANT_CONTACT_API_KEY;
  const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    return null;
  }

  // If we don't have an access token or we are forced to refresh
  if (!accessToken || forceRefresh) {
    return await refreshConstantContactToken(refreshToken, clientId, clientSecret);
  }

  return accessToken;
}

export async function syncContact(email: string, firstName: string, lastName: string, listId: string) {
  let token = await getValidAccessToken();

  if (!token) {
    console.warn("Constant Contact credentials missing. Skipping sync.");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Check if contact exists
    let searchRes = await fetch(`https://api.cc.email/v3/contacts?email=${encodeURIComponent(email)}&include=list_memberships`, {
      headers,
    });

    // Handle token expiration
    if (searchRes.status === 401) {
      console.log("CC token expired, refreshing...");
      token = await getValidAccessToken(true);
      if (!token) return;
      
      headers.Authorization = `Bearer ${token}`;
      searchRes = await fetch(`https://api.cc.email/v3/contacts?email=${encodeURIComponent(email)}&include=list_memberships`, {
        headers,
      });
    }

    if (!searchRes.ok) {
      throw new Error(`Failed to search contact: ${await searchRes.text()}`);
    }

    const searchData = await searchRes.json();
    const existingContact = searchData.contacts && searchData.contacts.length > 0 ? searchData.contacts[0] : null;

    if (existingContact) {
      // 2. Update existing contact
      const updateData = {
        email_address: { address: email },
        first_name: firstName || existingContact.first_name || "",
        last_name: lastName || existingContact.last_name || "",
        update_source: "Account",
        list_memberships: Array.from(new Set([
          ...(existingContact.list_memberships || []),
          listId
        ]))
      };

      const updateRes = await fetch(`https://api.cc.email/v3/contacts/${existingContact.contact_id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updateData),
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to update contact: ${await updateRes.text()}`);
      }
    } else {
      // 3. Create new contact
      const createData = {
        email_address: { address: email },
        first_name: firstName || "",
        last_name: lastName || "",
        create_source: "Account",
        list_memberships: [listId]
      };

      const createRes = await fetch(`https://api.cc.email/v3/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify(createData),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create contact: ${await createRes.text()}`);
      }
    }
  } catch (error) {
    console.error("[Constant Contact Sync Error]", error);
  }
}

/**
 * Removes a contact from a specific list by email.
 * Fetches the contact first to get its ID and current memberships,
 * then updates with the target list removed.
 */
export async function removeFromList(email: string, listIdToRemove: string) {
  let token = await getValidAccessToken();
  if (!token) {
    console.warn("[CC removeFromList] Credentials missing. Skipping.");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    let searchRes = await fetch(
      `https://api.cc.email/v3/contacts?email=${encodeURIComponent(email)}&include=list_memberships`,
      { headers }
    );

    if (searchRes.status === 401) {
      token = await getValidAccessToken(true);
      if (!token) return;
      headers.Authorization = `Bearer ${token}`;
      searchRes = await fetch(
        `https://api.cc.email/v3/contacts?email=${encodeURIComponent(email)}&include=list_memberships`,
        { headers }
      );
    }

    if (!searchRes.ok) {
      throw new Error(`[CC removeFromList] Failed to search: ${await searchRes.text()}`);
    }

    const searchData = await searchRes.json();
    const contact = searchData.contacts?.[0];
    if (!contact) {
      console.log(`[CC removeFromList] Contact not found for ${email}. Nothing to remove.`);
      return;
    }

    const newMemberships = (contact.list_memberships || []).filter(
      (id: string) => id !== listIdToRemove
    );

    const updateRes = await fetch(`https://api.cc.email/v3/contacts/${contact.contact_id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email_address: { address: email },
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        update_source: "Account",
        list_memberships: newMemberships,
      }),
    });

    if (!updateRes.ok) {
      throw new Error(`[CC removeFromList] Failed to update: ${await updateRes.text()}`);
    }

    console.log(`[CC removeFromList] Removed ${email} from list ${listIdToRemove}`);
  } catch (error) {
    console.error("[CC removeFromList Error]", error);
  }
}

export async function syncOnboardingContacts(
  studentEmail: string, studentFirst: string, studentLast: string,
  parentEmail: string, parentFirst: string, parentLast: string
) {
  if (studentEmail && studentEmail.trim() !== "") {
    await syncContact(studentEmail, studentFirst, studentLast, CONSTANT_CONTACT_STUDENT_LIST);
  }
  if (parentEmail && parentEmail.trim() !== "") {
    await syncContact(parentEmail, parentFirst, parentLast, CONSTANT_CONTACT_PARENT_LIST);
  }
}
