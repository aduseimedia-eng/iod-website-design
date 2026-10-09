export function GET() {
  return Response.json({ status: "ok", service: "iod-gh-exam-portal" }, { headers: { "Cache-Control": "no-store" } });
}
