import { AttemptWorkspace } from "../../../components/AttemptWorkspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AttemptWorkspace key={id} id={id} />; }
