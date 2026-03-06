import React from 'react'
import DemographicForm from '../_components/Demographic'
import { cookies } from 'next/headers'
import NormalScreening from '../_components/NormalScreening';

const page = async () => {
    const cookieStore = await cookies();
    const currentUser = cookieStore.get("user_session")?.value || null
    return (
        <div>
            <NormalScreening currentUser={currentUser}/>
        </div>
    )
}

export default page
