import { createClient } from "@libsql/client";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALPHARD_CORRECTIONS, ADDRESS_CORRECTIONS } from "../src/lib/restart-data-corrections";

export async function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "tomepita-test-"));
  const url = `file:${join(dir, "test.db")}`;
  const client = createClient({ url });
  await client.executeMultiple(readFileSync("drizzle/0000_fantastic_skreet.sql", "utf8"));
  await client.executeMultiple(readFileSync("drizzle/0001_motionless_jane_foster.sql", "utf8"));
  await client.execute("INSERT INTO makers(id,name,slug) VALUES(1,'トヨタ','toyota')");
  await client.execute("INSERT INTO models(id,maker_id,name,slug,body_type) VALUES(1,1,'アルファード','alphard','minivan')");
  await client.execute("INSERT INTO generations(id,model_id,name,start_year) VALUES(1,1,'40系 (2023-)',2023),(2,1,'30系後期 (2018-2022)',2018)");
  await client.execute("INSERT INTO phases(id,generation_id,name) VALUES(1,1,'現行型'),(2,2,'前期型')");
  for (const [index, correction] of ALPHARD_CORRECTIONS.entries()) {
    const id = index + 1;
    await client.execute({ sql: "INSERT INTO trims(id,phase_id,name,drive_type) VALUES(?,1,?,?)", args: [id,correction.trim,correction.drive] });
    await client.execute({ sql: "INSERT INTO dimensions(id,trim_id,length_mm,width_mm,height_mm,weight_kg) VALUES(?,?,4995,1850,1935,?)", args: [id,id,correction.oldWeight] });
  }
  await client.execute("INSERT INTO trims(id,phase_id,name,drive_type) VALUES(10,2,'Executive Lounge 2.5L HV','2WD')");
  await client.execute("INSERT INTO dimensions(id,trim_id,length_mm,width_mm,height_mm,weight_kg) VALUES(10,10,4950,1850,1935,2090)");
  for (const [index, correction] of ADDRESS_CORRECTIONS.entries()) {
    await client.execute({ sql: "INSERT INTO parking_lots(id,name,slug,address,latitude,longitude) VALUES(?,?,?,?,35.662,139.702)", args: [index+1,"宮下公園駐車場",correction.slug,"東京都が発行する愛の手帳"+correction.address] });
  }
  await client.execute("INSERT INTO parking_lots(id,name,slug,address,latitude,longitude) VALUES(3,'宮下公園南バイク駐車場','bike','東京都渋谷区渋谷１丁目',35.662,139.702),(4,'時間貸駐輪場','bicycle','東京都渋谷区渋谷１丁目',35.662,139.702)");
  for (let id=1;id<=4;id++) await client.execute({ sql:"INSERT INTO vehicle_restrictions(parking_lot_id,restriction_name,max_length_mm,max_width_mm,max_height_mm,max_weight_kg) VALUES(?,'一般',5300,2050,2100,2500)",args:[id] });
  return { client, url, close() { client.close(); rmSync(dir, { recursive: true, force: true }); } };
}
