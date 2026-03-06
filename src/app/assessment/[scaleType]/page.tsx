import { cookies } from 'next/headers';
import DynamicAssismentForm from './DynamicAssismentForm';

const page = async ({ params }: { params: Promise<{ scaleType: string }> }) => {
    
    const cookieStore = await cookies();
    const currentUser = cookieStore.get("user_session")?.value || null

    return (
        <DynamicAssismentForm params={params} currentUser={currentUser} />
    )

    
};

export default page;


// const DynamicAssessmentForm = ({ params }: { params: Promise<{ scaleType: string }> }) => {
//   const resolvedParams = use(params);
//   const scaleType = resolvedParams.scaleType;

