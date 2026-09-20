import { getAllTrimsWithDimensions, getModelBySlug } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,100}$/.test(slug))
    return Response.json({ error: "車種が見つかりません" }, { status: 404 });
  const model = await getModelBySlug(slug);
  if (!model)
    return Response.json({ error: "車種が見つかりません" }, { status: 404 });
  const grades = await getAllTrimsWithDimensions(model.id);
  return Response.json(
    { grades },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      },
    },
  );
}
