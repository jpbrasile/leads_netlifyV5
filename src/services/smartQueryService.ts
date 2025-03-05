/// <reference types="vite/client" />
//import 'vite/client';
// src/services/smartQueryService.ts

import { supabase } from '../lib/supabaseClient';

//const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MODEL_NAME = "mistralai/mistral-medium";

// Database schema as defined in main.js
export const schemaDefinition = `
-- historique_appels (Call History)
CREATE TABLE historique_appels (
    appel_id INTEGER PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(prospect_id),
    date_appel TIMESTAMP,
    notes TEXT
);

-- historique_emails (Email History)
CREATE TABLE historique_emails (
    email_id INTEGER PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(prospect_id),
    date_email TIMESTAMP,
    expediteur TEXT,
    destinataire TEXT,
    sujet TEXT,
    corps TEXT
);

-- historique_meetings (Meeting History)
CREATE TABLE historique_meetings (
    meeting_id INTEGER PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(prospect_id),
    entreprise_id INTEGER REFERENCES entreprises(entreprise_id),
    date_meeting TIMESTAMP,
    participants TEXT,
    notes TEXT
);

-- prospects (Prospects)
CREATE TABLE prospects (
    prospect_id INTEGER PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    entreprise_id INTEGER REFERENCES entreprises(entreprise_id),
    email TEXT,
    telephone TEXT,
    fonction TEXT,
    notes TEXT,
    date_creation TIMESTAMP,
    date_mise_a_jour TIMESTAMP
);

-- entreprises (Companies)
CREATE TABLE entreprises (
    entreprise_id INTEGER PRIMARY KEY,
    nom_entreprise TEXT,
    secteur_activite TEXT,
    taille_entreprise TEXT,
    adresse TEXT,
    site_web TEXT,
    strategie_entreprise TEXT,
    notes TEXT,
    date_creation TIMESTAMP,
    date_mise_a_jour TIMESTAMP
);

-- taches (Tasks)
CREATE TABLE taches (
    tache_id INTEGER PRIMARY KEY,
    prospect_id INTEGER REFERENCES prospects(prospect_id),
    libelle TEXT,
    status TEXT,
    date_objectif DATE,
    date_creation TIMESTAMP,
    date_mise_a_jour TIMESTAMP,
    notes TEXT
);

CREATE TABLE categories(
    id INTEGER PRIMARY KEY,
    name TEXT
);
`;

// Example natural language query and corresponding SQL.
export const examples = `
Question: "Quels prospects ont été contactés (par email ou appel) au cours du dernier mois, avec les détails des réunions auxquelles ils ont participé, et la taille de leur entreprise?"
SQL:
SELECT
    p.nom,
    p.prenom,
    p.email,
    e.nom_entreprise,
    e.taille_entreprise,
    COALESCE(he.date_email, ha.date_appel) AS date_dernier_contact,
    hm.date_meeting,
    hm.participants,
    hm.notes AS meeting_notes
FROM
    prospects p
JOIN
    entreprises e ON p.entreprise_id = e.entreprise_id
LEFT JOIN
    historique_emails he ON p.prospect_id = he.prospect_id
LEFT JOIN
    historique_appels ha ON p.prospect_id = ha.prospect_id
LEFT JOIN
    historique_meetings hm ON p.prospect_id = hm.prospect_id
WHERE
    (he.date_email >= CURRENT_DATE - INTERVAL '1 month' OR ha.date_appel >= CURRENT_DATE - INTERVAL '1 month')
ORDER BY
    COALESCE(he.date_email, ha.date_appel) DESC;
`;

/**
 * Generates an SQL query from a natural language question using the provided schema and examples.
 */
export async function generateSQL(userQuestion: string): Promise<string> {
  const prompt = `You are a helpful assistant that translates natural language questions into SQL queries for a Supabase (PostgreSQL) database.

Here is the database schema:

${schemaDefinition}

Here are a few examples of natural language questions and their corresponding SQL queries:

${examples}

Only generate SQL code, do not include any explanatory text. Do not include any markdown code blocks.

IMPORTANT GUIDELINES:
1. Use standard PostgreSQL syntax
2. For date operations, use CURRENT_DATE - INTERVAL '1 month' instead of date('now', '-1 month')
3. NEVER use backslash escapes in your SQL - write column names directly without escaping underscores
4. Underscores in column names should be written as is, without any backslash before them

Now, answer the following question:

Question: ${userQuestion}
SQL:`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0
    })
  });

  if (!response.ok) {
    throw new Error("Error generating SQL");
  }

  const data = await response.json();
  let generatedSQL: string = data.choices[0].message.content.trim();
  // Remove any backslash escapes that might have been injected
  generatedSQL = generatedSQL.replace(/\\/g, '');
  return generatedSQL;
}

/**
 * Validates the generated SQL by executing a test query via Supabase RPC.
 */
export async function validateSQLInSupabase(sqlQuery: string): Promise<[boolean, string]> {
  try {
    const cleanQuery = sqlQuery.replace(/\\/g, "").trim().replace(/;$/, "");
    const testQuery = `SELECT 1 AS validation_test FROM (${cleanQuery}) AS subquery WHERE 1=0`;
    const { error } = await supabase.rpc("execute_sql_safe", { sql_text: testQuery });
    if (error) return [false, error.message];
    return [true, "SQL is valid"];
  } catch (err: any) {
    return [false, err.message];
  }
}

/**
 * Executes the provided SQL query via the Supabase RPC.
 */
export async function executeQuery(sqlQuery: string): Promise<any> {
  try {
    const cleanQuery = sqlQuery.replace(/\\/g, "").trim().replace(/;$/, "");
    const { data, error } = await supabase.rpc("execute_sql_safe", { sql_text: cleanQuery });
    if (error) {
      return `Error in SQL: ${error.message}`;
    }
    return data;
  } catch (err: any) {
    return `Error executing query: ${err.message}`;
  }
}

/**
 * Generates a human-readable summary of the query results.
 */
export async function generateSummary(userQuestion: string, queryResults: any): Promise<string> {
  const prompt = `You are a helpful assistant that summarizes database query results in a clear and concise way.

Original Question: ${userQuestion}

Query Results (JSON):
${JSON.stringify(queryResults, null, 2)}

Provide a human-readable summary of these results. Be specific and answer the original question directly.`;
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0
    })
  });
  
  if (!response.ok) {
    throw new Error("Error generating summary");
  }
  
  const data = await response.json();
  const summary: string = data.choices[0].message.content.trim();
  return summary;
}

/**
 * Orchestrates the full smart query flow:
 * 1. Generate an SQL query from the user's natural language question.
 * 2. Validate the generated SQL.
 * 3. If valid, execute the SQL query.
 * 4. Optionally generate a summary of the query results.
 *
 * Returns an object with the generated SQL, its validation result, the query results, and the summary.
 */
export async function runSmartQuery(userQuestion: string): Promise<{
  sql: string;
  validation: [boolean, string];
  queryResults: any;
  summary: string;
}> {
  const sql = await generateSQL(userQuestion);
  const validation = await validateSQLInSupabase(sql);
  let queryResults: any = null;
  let summary = "";
  if (validation[0]) {
    queryResults = await executeQuery(sql);
    if (queryResults) {
      summary = await generateSummary(userQuestion, queryResults);
    }
  }
  return { sql, validation, queryResults, summary };
}