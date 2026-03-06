import React from 'react'
import LandingPage from './_components/LandingPage'
import DemographicForm from './_components/Demographic'
import { cookies } from 'next/headers'

const page = async() => {
  const cookieStore = await cookies();
  const currentUser = cookieStore.get("user_session")?.value || null
  return (
    <div>
      <LandingPage currentUser={currentUser}/>
    </div>
  )
}

export default page
