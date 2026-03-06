import React from 'react'
import DemographicForm from '../_components/Demographic'
import { cookies } from 'next/headers'
import ResearchScreening from '../_components/ResearchScreening';

const page = async () => {
    const cookieStore = await cookies();
    const currentUser = cookieStore.get("user_session")?.value || null
    return (
        <div>
            <ResearchScreening currentUser={currentUser} />
        </div>
    )
}

export default page
