async function testApi() {
  const url = 'https://api.l4d2center.com/v2/getbanrecords?search=76561197967323496&filter=manual&page=0&csrf=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbWlkNjQiOiI3NjU2MTE5OTQ4MjA0NjA0MSIsImV4cCI6MTgwNzY0NzgwNH0.cEZNhJ_tNLZIDlNyIxEKSYRb1zkhf4yQ5b4Nhcpt4Zc';
  const res = await fetch(url, {
    headers: {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en,es-US;q=0.9,es-419;q=0.8,es;q=0.7',
      'cache-control': 'no-cache',
      'cookie': 'auth2=ynxwtgnr2eazvqqdxfzlo5xtbgvgcdagfez8runk; session_id=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbWlkNjQiOiI3NjU2MTE5OTQ4MjA0NjA0MSIsImV4cCI6MTgwNzY0NzgwNH0.w-hlCrTOvIa0GAJkS4kzvwnnhsJh9oHDfwXy_sTkK5A; cf_clearance=oMbVJEAxRg0b41Veo.H26nyTNe0Go63_cyy9VjqgcQ4-1778214500-1.2.1.1-gKXkx7qD3lioTopGCzQhQtBCGoGc0ZM9tQspFbJxB1MIitYpT5pn1SvE4CgEDt3bjdStor1mUXX_p8R5rMeOyzgX62CK0.UlVbLY7JXTOGCTVfYhXxUBVDYBtTNWKCnmT.wqCaext9wg5BfwhSNALrRCv_6ETUxnBYL4tGO6s0XkQGvF49h3KEN_GwObFYHjzzAZvdT.s3BYtyWPlYmiMtX_9nSnu.aIYCaEgl5DtXbhbnhPF5_gwp8Aw6HMHnmKgKUGSgVwL2IuVT6SQkwKNf70f9ZtnBYqftppzpBYTFZDzdxv666EX2U_kiz0csEbNMTE5bpujdoSm7W05LWm8Q',
      'origin': 'https://l4d2center.com',
      'referer': 'https://l4d2center.com/',
      'user-agent': 'Mozilla/5.0'
    }
  });
  console.log('CORS Headers:', res.headers.get('access-control-allow-origin'));
}
testApi();
