import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function test() {
  const { data: invs, error: e1 } = await supabase.from('user_investments').select('id, user_id').limit(1)
  console.log('Investments:', invs, e1)

  if (invs && invs.length > 0) {
    const { data, error } = await supabase.rpc('get_investment_detail_enriched', {
      p_investment_id: invs[0].id
    })
    console.log('RPC result:', data)
    console.log('RPC error:', error)
  }
}

test()
