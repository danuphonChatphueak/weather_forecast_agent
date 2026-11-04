import { getPool } from "./db/msql_db.js";
import type sql from "mssql";

async function main() {
    let pool: sql.ConnectionPool | undefined;

    try {
        console.log("Connecting to Azure SQL...");

        pool = await getPool();

        console.log("Database connected!");

        const result = await pool.request().query(`
            SELECT DB_NAME() AS database_name
        `);

        console.log("Database:", result.recordset);

        const table = await pool.request().query(`
            SELECT COUNT(*) AS total
            FROM dbo.weatherAgentDb
        `);

        console.log("Memory count:", table.recordset[0].total);

    } catch (error) {
        console.error("Database test failed:", error);
        process.exitCode = 1;

    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

main();