import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function parseDeadline(deadlineStr: string | undefined | null): string {
  if (!deadlineStr) return "2099-12-31";
  
  try {
    // If it's already a valid date string YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) return deadlineStr;

    // Try to parse it using native Date
    const d = new Date(deadlineStr);
    
    if (!isNaN(d.getTime())) {
      // If year is 2001 (default for some parsers without year) or very old, set to next year
      if (d.getFullYear() < new Date().getFullYear()) {
        d.setFullYear(new Date().getFullYear() + 1);
      }
      return d.toISOString().split("T")[0];
    }

    // Try parsing "Month DD" format
    const match = deadlineStr.match(/([a-zA-Z]+)\s+(\d+)/);
    if (match) {
      const currentYear = new Date().getFullYear();
      const testDate = new Date(`${match[1]} ${match[2]}, ${currentYear}`);
      if (!isNaN(testDate.getTime())) {
        if (testDate < new Date()) {
          testDate.setFullYear(currentYear + 1);
        }
        return testDate.toISOString().split("T")[0];
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  return "2099-12-31"; // Fallback to far future if unparseable
}

function parseGradeLevels(enrollmentStr: string | undefined): string[] {
  if (!enrollmentStr) return [];
  const levels = [];
  const lower = enrollmentStr.toLowerCase();
  
  if (lower.includes("high school")) levels.push("High School");
  if (lower.includes("college") || lower.includes("undergraduate") || lower.includes("bachelor")) levels.push("Undergraduate");
  if (lower.includes("graduate") || lower.includes("master") || lower.includes("phd") || lower.includes("doctoral")) levels.push("Graduate");
  
  return levels;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // We expect the payload from Apify to contain resource.defaultDatasetId
    const datasetId = payload?.resource?.defaultDatasetId;
    if (!datasetId) {
      return NextResponse.json({ error: "Missing datasetId in webhook payload" }, { status: 400 });
    }

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_TOKEN) {
      console.error("Missing APIFY_API_TOKEN environment variable");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Fetch the items from the Apify dataset
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
    if (!datasetRes.ok) {
      return NextResponse.json({ error: "Failed to fetch dataset from Apify" }, { status: 500 });
    }
    const items = await datasetRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "No items found in dataset" }, { status: 200 });
    }

    const adminSupabase = await createAdminClient();
    let processedCount = 0;

    // Process each item and map to our database schema
    for (const item of items) {
      if (!item.title || (!item.detail_url && !item.apply_url)) continue; // Skip invalid items

      const scholarshipLink = item.apply_url || item.detail_url;
      const awardAmount = item.award || (item.award_amount ? `$${item.award_amount}` : "Varies");
      
      const mapped = {
        name: item.title,
        link: scholarshipLink,
        award_amount: awardAmount,
        award_amount_value: typeof item.award_amount === 'number' ? item.award_amount : null,
        deadline: parseDeadline(item.deadline),
        category: "General", // The scraper doesn't seem to return a unified category
        description: item.full_description || item.description || "",
        eligible_majors: item.majors || "All Majors Eligible",
        eligible_states: item.geographic_restrictions || "All",
        state_eligibility_all: (item.geographic_restrictions || "").toLowerCase().includes("no geographic") || (item.geographic_restrictions || "").toLowerCase().includes("all"),
        grade_levels: parseGradeLevels(item.enrollment_level || item.enrollment_detail),
        organization_name: item.sponsor_name || "",
        award_frequency: ((item.renewable || "").toLowerCase() === "yes" ? "renewable" : "one_time") as "renewable" | "one_time",
        is_active: true
      };

      // Upsert into Supabase (we use 'link' as the unique identifier if possible, but since we don't have a unique constraint on link, 
      // we'll manually check if it exists by link)
      const { data: existing } = await adminSupabase
        .from('scholarships')
        .select('id')
        .eq('link', mapped.link)
        .limit(1)
        .single();

      if (existing) {
        // Update
        await adminSupabase
          .from('scholarships')
          .update(mapped)
          .eq('id', existing.id);
      } else {
        // Insert
        await adminSupabase
          .from('scholarships')
          .insert([mapped]);
      }
      processedCount++;
    }

    return NextResponse.json({ message: `Successfully processed ${processedCount} scholarships` });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
