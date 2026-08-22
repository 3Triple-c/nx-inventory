export async function register() {
  // Guard against the Edge runtime — these handlers use Prisma, which
  // needs Node. Without this check, Next.js would also try to run this in
  // Edge middleware contexts and fail.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNotificationHandlers } =
      await import("@nx-inventory/notifications");
    registerNotificationHandlers();
  }
}
