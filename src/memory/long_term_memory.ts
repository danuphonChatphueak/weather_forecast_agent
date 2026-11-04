import sql from "mssql";
import { getPool } from "../db/msql_db.js";

export class LongTermMemory {
    async save(
        userID: string,
        key: string,
        value: string
    ): Promise<void> {
        const pool = await getPool();
        
        await pool.request()
            .input("userId", sql.NVarChar(100), userID)
            .input("memoryKey", sql.NVarChar(100), key)
            .input("memoryValue", sql.NVarChar(sql.MAX), value)
            .query(`
                MERGE dbo.WeatherAgentDb WITH (HOLDLOCK) AS target
                USING (
                    SELECT
                        @userId AS user_id,
                        @memoryKey AS memory_key,
                        @memoryValue AS memory_value
                ) AS source
                ON target.user_id = source.user_id
                   AND target.memory_key = source.memory_key

                WHEN MATCHED THEN
                    UPDATE SET
                        memory_value = source.memory_value,
                        update_at = SYSUTCDATETIME()

                WHEN NOT MATCHED THEN
                    INSERT (
                        user_id,
                        memory_key,
                        memory_value
                    )
                    VALUES (
                        source.user_id,
                        source.memory_key,
                        source.memory_value
                    );
            `);
    }       
    async get(
        userId: string,
        key: string
    ): Promise<string | undefined> {
        const pool = await getPool();
        const result = await pool.request()
            .input("userId", sql.NVarChar(100), userId)
            .input("memoryKey", sql.NVarChar(100), key)
            .query<{ memory_value: string }>(`
                SELECT memory_value
                FROM dbo.weatherAgentdb
                WHERE user_id = @userId
                AND memory_key = @memoryKey
            `);

        return result.recordset[0]?.memory_value;
    }
}