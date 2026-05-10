const protobuf = require("protobufjs");

var Type = protobuf.Type,
    Field = protobuf.Field;

var BanRecord = new Type("BanRecord");

BanRecord.add(new Field("ID", 1, "int64"));
BanRecord.add(new Field("Nickname", 2, "string"));
BanRecord.add(new Field("SteamID", 3, "string"));
BanRecord.add(new Field("Restrictions", 4, "int32"));
BanRecord.add(new Field("Immediate", 5, "bool"));
BanRecord.add(new Field("BannedBy", 6, "string"));
BanRecord.add(new Field("BanLength", 7, "int64"));
BanRecord.add(new Field("BannedAt", 8, "int64"));
BanRecord.add(new Field("AcceptedAt", 9, "int64"));
BanRecord.add(new Field("Description", 10, "string"));
BanRecord.add(new Field("Reasons", 11, "int64"));
BanRecord.add(new Field("UnbannedBy", 12, "string"));

var BanRecords = new Type("BanRecords");

BanRecords.add(new Field("Success", 1, "bool"));
BanRecords.add(new Field("Page", 2, "int32"));
BanRecords.add(new Field("MaxPages", 3, "int32"));
BanRecords.add(new Field("Bans", 4, "BanRecord", "repeated"));
BanRecords.add(new Field("StatBannedRQ", 5, "int32"));
BanRecords.add(new Field("StatUnbannedRQ", 6, "int32"));
BanRecords.add(new Field("StatBannedRQTotal", 7, "int32"));

BanRecords.add(BanRecord);

async function loadBans() {

    const response = await fetch(
        "https://api.l4d2center.com/v2/getbanrecords?search=76561197967323496&page=0&csrf=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbWlkNjQiOiI3NjU2MTE5OTQ4MjA0NjA0MSIsImV4cCI6MTgwNzY0NzgwNH0.cEZNhJ_tNLZIDlNyIxEKSYRb1zkhf4yQ5b4Nhcpt4Zc",
        {
            headers: {
              'cookie': 'auth2=ynxwtgnr2eazvqqdxfzlo5xtbgvgcdagfez8runk; session_id=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbWlkNjQiOiI3NjU2MTE5OTQ4MjA0NjA0MSIsImV4cCI6MTgwNzY0NzgwNH0.w-hlCrTOvIa0GAJkS4kzvwnnhsJh9oHDfwXy_sTkK5A; cf_clearance=oMbVJEAxRg0b41Veo.H26nyTNe0Go63_cyy9VjqgcQ4-1778214500-1.2.1.1-gKXkx7qD3lioTopGCzQhQtBCGoGc0ZM9tQspFbJxB1MIitYpT5pn1SvE4CgEDt3bjdStor1mUXX_p8R5rMeOyzgX62CK0.UlVbLY7JXTOGCTVfYhXxUBVDYBtTNWKCnmT.wqCaext9wg5BfwhSNALrRCv_6ETUxnBYL4tGO6s0XkQGvF49h3KEN_GwObFYHjzzAZvdT.s3BYtyWPlYmiMtX_9nSnu.aIYCaEgl5DtXbhbnhPF5_gwp8Aw6HMHnmKgKUGSgVwL2IuVT6SQkwKNf70f9ZtnBYqftppzpBYTFZDzdxv666EX2U_kiz0csEbNMTE5bpujdoSm7W05LWm8Q',
              'user-agent': 'Mozilla/5.0'
            }
        }
    );
    if (!response.ok) {
        console.error("API error:", response.status);
        return;
    }

    const buffer = await response.arrayBuffer();

    // protobuf decode
    const decoded = BanRecords.decode(
        new Uint8Array(buffer)
    );

    // convertir a json limpio
    const json = BanRecords.toObject(decoded, {
        longs: String,
        enums: String,
        defaults: true
    });

    console.log(JSON.stringify(json, null, 2));
}

loadBans();
