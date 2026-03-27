import CollectionManager from '@/components/CollectionManager/CollectionManager';

interface CollectionDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
    const { id } = await params;
    return <CollectionManager collectionId={id} />;
}
