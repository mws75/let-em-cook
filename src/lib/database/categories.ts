import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";
import { Category } from "@/types/types";

interface CategoryRow extends RowDataPacket {
  category_id: number;
  user_id: number;
  category_name: string;
  color_hex: string;
}

export async function getUserCategories(userId: number): Promise<Category[]> {
  const rows = await executeQuery<CategoryRow[]>(
    `SELECT category_id, user_id, category_name, color_hex
     FROM ltc_categories
     WHERE user_id = ? 
     ORDER BY category_name ASC`,
    [userId],
  );
  return rows.map((row) => ({
    category_id: row.category_id,
    user_id: row.user_id,
    category_name: row.category_name,
    color_hex: row.color_hex,
  }));
}
