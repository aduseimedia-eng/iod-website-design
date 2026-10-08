import { Result } from "../../../../components/Portal";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Result id={id} />; }
