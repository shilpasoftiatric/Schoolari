export const CONSTANT_CONTACT_PARENT_LIST = process.env.CONSTANT_CONTACT_PARENT_LIST || "cdff2514-7ebe-11f1-a371-02420a320002";
export const CONSTANT_CONTACT_STUDENT_LIST = process.env.CONSTANT_CONTACT_STUDENT_LIST || "fdcd3218-7ebe-11f1-94bb-02420a320003";

async function getValidAccessToken() {
  // If an access token is provided directly and we don't want to manage refresh, use it.
  if (process.env.CONSTANT_CONTACT_ACCESS_TOKEN) {
    return process.env.CONSTANT_CONTACT_ACCESS_TOKEN;
  }

  // Refresh token logic
  const refreshToken = process.env.CONSTANT_CONTACT_REFRESH_TOKEN;
  const clientId = process.env.CONSTANT_CONTACT_API_KEY;
  const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    return null;
  }

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
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing CC token", error);
    return null;
  }
}

export async function syncContact(email: string, firstName: string, lastName: string, listId: string) {
  const token = await getValidAccessToken();

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
    const searchRes = await fetch(`https://api.cc.email/v3/contacts?email=${encodeURIComponent(email)}&include=list_memberships`, {
      headers,
    });

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
