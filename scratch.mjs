import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whpqxsjfctiwowgtlygk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndocHF4c2pmY3Rpd293Z3RseWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE4NDg2MiwiZXhwIjoyMDkzNzYwODYyfQ.XPg9_ijUtlMyG1K3dp7VvNrD566BKzgGLZnClJdqLK4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tData } = await supabase.from('tournaments').select('*').limit(1);
  console.log("Tournaments keys:", tData?.[0] ? Object.keys(tData[0]) : "No data");

  const { data: teamData } = await supabase.from('teams').select('*').limit(1);
  console.log("Teams keys:", teamData?.[0] ? Object.keys(teamData[0]) : "No data");
}
check();
