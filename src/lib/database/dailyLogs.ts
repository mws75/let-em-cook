import { executeQuery } from "./connection";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { DailyLog, DailyLogEntry } from "@/types/types";

interface DailyLogRow extends RowDataPacket {
  log_date: Date | string;
  entries_json: string | DailyLogEntry[];
  notes: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDateString(date: string): void {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(
      `Invalid date "${date}" — expected YYYY-MM-DD calendar date`,
    );
  }
}

// MySQL DATE columns come back as a JS Date (midnight UTC) under our pool
// config. Normalise to a YYYY-MM-DD wall-clock string so the wire format
// matches what we accepted on the way in.
function normalizeDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function parseEntries(value: string | DailyLogEntry[]): DailyLogEntry[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return JSON.parse(value) as DailyLogEntry[];
}

function rowToLog(row: DailyLogRow): DailyLog {
  return {
    log_date: normalizeDate(row.log_date),
    entries: parseEntries(row.entries_json),
    notes: row.notes ?? undefined,
  };
}

export async function getDailyLog(
  userId: number,
  date: string,
): Promise<DailyLog | null> {
  if (!userId) throw new Error("User Id is required");
  assertDateString(date);

  try {
    const rows = await executeQuery<DailyLogRow[]>(
      `SELECT log_date, entries_json, notes
       FROM ltc_daily_logs
       WHERE user_id = ? AND log_date = ?
       LIMIT 1`,
      [userId, date],
    );

    if (rows.length === 0) return null;
    return rowToLog(rows[0]);
  } catch (error) {
    console.error("Error fetching daily log", error);
    throw new Error("Failed to load daily log");
  }
}

export async function getDailyLogRange(
  userId: number,
  start: string,
  end: string,
): Promise<DailyLog[]> {
  if (!userId) throw new Error("User Id is required");
  assertDateString(start);
  assertDateString(end);
  if (start > end) {
    throw new Error("Range start must be on or before end");
  }

  try {
    const rows = await executeQuery<DailyLogRow[]>(
      `SELECT log_date, entries_json, notes
       FROM ltc_daily_logs
       WHERE user_id = ? AND log_date BETWEEN ? AND ?
       ORDER BY log_date ASC`,
      [userId, start, end],
    );

    return rows.map(rowToLog);
  } catch (error) {
    console.error("Error fetching daily log range", error);
    throw new Error("Failed to load daily logs");
  }
}

export async function upsertDailyLog(
  userId: number,
  log: DailyLog,
): Promise<void> {
  if (!userId) throw new Error("User Id is required");
  if (!log) throw new Error("Daily log payload is required");
  assertDateString(log.log_date);

  const entriesJson = JSON.stringify(log.entries ?? []);
  const notes = log.notes ?? null;

  try {
    await executeQuery<ResultSetHeader>(
      `INSERT INTO ltc_daily_logs (user_id, log_date, entries_json, notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         entries_json = VALUES(entries_json),
         notes        = VALUES(notes),
         modified_on  = CURRENT_TIMESTAMP`,
      [userId, log.log_date, entriesJson, notes],
    );
  } catch (error) {
    console.error("Error upserting daily log", error);
    throw new Error("Failed to save daily log");
  }
}

export async function deleteDailyLog(
  userId: number,
  date: string,
): Promise<void> {
  if (!userId) throw new Error("User Id is required");
  assertDateString(date);

  try {
    await executeQuery<ResultSetHeader>(
      `DELETE FROM ltc_daily_logs WHERE user_id = ? AND log_date = ?`,
      [userId, date],
    );
  } catch (error) {
    console.error("Error deleting daily log", error);
    throw new Error("Failed to delete daily log");
  }
}
