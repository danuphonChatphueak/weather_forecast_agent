import sql from "mssql";
import "dotenv/config";

function getRequireVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not set.`);
    }
    return value;
}

const config: sql.config = {
    server: getRequireVariable("AZURE_SQL_SERVER"),
    database: getRequireVariable("AZURE_SQL_DATABASE"),
    port: Number(getRequireVariable("AZURE_SQL_PORT")),
    connectionTimeout: 30000,
    user: getRequireVariable("AZURE_SQL_USER"),
    password: getRequireVariable("AZURE_SQL_PASSWORD"),

    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    

    pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
    if (!poolPromise) {
        const pool = new sql.ConnectionPool(config);

        pool.on("error", (err) => {
            console.error("SQL Pool Error:", err);
        });

        poolPromise = pool.connect().then(() => {
            console.log("Connected to Azure SQL Database");
            return pool;
        }).catch((err) => {
            console.error("Error connecting to Azure SQL Database:", err);
            throw err;
        });
    }
    return poolPromise;
}
