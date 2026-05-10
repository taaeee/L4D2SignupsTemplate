import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whpqxsjfctiwowgtlygk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndocHF4c2pmY3Rpd293Z3RseWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE4NDg2MiwiZXhwIjoyMDkzNzYwODYyfQ.XPg9_ijUtlMyG1K3dp7VvNrD566BKzgGLZnClJdqLK4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function alterTable() {
  const { data, error } = await supabase.rpc('query', {
    query_text: `
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS logo_url text,
      ADD COLUMN IF NOT EXISTS rules text,
      ADD COLUMN IF NOT EXISTS social_links jsonb;
    `
  });
  console.log("Alter response:", error || data);
}
alterTable();
