import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: tourneys } = await supabase.from('tournaments').select('*').eq('tournament_format', 'double_elimination').limit(1);
  if (!tourneys || tourneys.length === 0) return;
  const tournament = tourneys[0];
  const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', tournament.id);
  
  const ubRounds = {};
  const lbRounds = {};
  
  const bracketMap = tournament?.template_json?.bracket_map || {};

  matches.forEach(m => {
    const meta = bracketMap[m.id] || {};
    if (meta.is_bye) return; 

    m.is_upper = meta.is_upper;
    
    if (m.is_upper) {
      if (!ubRounds[m.round]) ubRounds[m.round] = [];
      ubRounds[m.round].push(m);
    } else {
      if (!lbRounds[m.round]) lbRounds[m.round] = [];
      lbRounds[m.round].push(m);
    }
  });

  const ubRoundKeys = Object.keys(ubRounds).map(Number).sort((a, b) => a - b);
  const lbRoundKeys = Object.keys(lbRounds).map(Number).sort((a, b) => a - b);

  console.log("Upper Keys:", ubRoundKeys);
  console.log("Lower Keys:", lbRoundKeys);
  if (ubRoundKeys.length > 0) {
    console.log("Upper M1 length:", ubRounds[ubRoundKeys[0]]?.length);
  }
}
run();
