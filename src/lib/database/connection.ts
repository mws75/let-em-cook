import mysql from "mysql2/promise";

// Create connection pool for Planet Scale
// Connection pool reruses connections for better performance

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // PlanetScale requires SSL
      ssl: {
        rejectUnauthorized: true,
      },
    });
  }
  return pool;
}

// Helper to execute queries
export async function executeQuery<T>(
  query: string,
  params: any[] = [],
): Promise<T> {
  const pool = getPool();
  const [rows] = await pool.execute(query, params);
  return rows as T;
}

export async function withTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
