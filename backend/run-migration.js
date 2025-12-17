require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
    console.log('🔧 Running database migration...\n');
    
    const sql = fs.readFileSync('./fix-foreign-key.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
    
    for (const statement of statements) {
        console.log(`Executing: ${statement.trim().substring(0, 80)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
            console.error('❌  Error:', error.message);
        } else {
            console.log('✅ Success\n');
        }
    }
    
    console.log('\n🎉 Migration complete!');
}

runMigration().then(() => process.exit(0)).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
