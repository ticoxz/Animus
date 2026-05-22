import { getSupabase } from "@/lib/supabase/server";

export interface PendingTransaction {
  id: string;
  amount_cents: number;
  currency: string;
  category: string | null;
  description: string | null;
}

export async function createPendingTransaction(input: {
  userId: string;
  amountCents: number;
  currency?: string;
  category?: string;
  description?: string;
  rawMessage: string;
}): Promise<PendingTransaction | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: input.userId,
      amount_cents: input.amountCents,
      currency: input.currency ?? "ARS",
      category: input.category ?? null,
      description: input.description ?? null,
      confirmed: false,
      raw_message: input.rawMessage,
    })
    .select("id, amount_cents, currency, category, description")
    .single();

  if (error) {
    console.error("[db] createPendingTransaction", error);
    return null;
  }

  return data as PendingTransaction;
}

export async function confirmTransaction(
  transactionId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("transactions")
    .update({ confirmed: true })
    .eq("id", transactionId)
    .eq("user_id", userId);

  return !error;
}

export async function deleteTransaction(
  transactionId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId)
    .eq("confirmed", false);

  return !error;
}

export function formatAmount(amountCents: number, currency: string): string {
  const value = amountCents / 100;
  if (currency === "ARS") {
    return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${value.toFixed(2)}`;
}
