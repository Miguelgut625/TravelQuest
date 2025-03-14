import { useEffect, useState } from "react"
import { supabase } from "../supabase/client"
import { useNavigate } from "react-router-dom"
import TaskForm from "../components/TaskForm";

import TaskList from "../components/TaskList";

function Home() {
const [showTaskDone,setShowTaskDone] = useState(true);

const navigate = useNavigate();

    
useEffect(() => {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate("/login");
        }
    };
    checkUser();
}, [navigate]);

return (
        <div>
            Home
            <button onClick={() => supabase.auth.signOut()}> Salir </button>
        
        <TaskForm/>
        <header>
<span>Tareas Pendientes</span>
<button onClick={()=>setShowTaskDone(!showTaskDone)}>
Mostrar Tareas Completadas
</button>
</header>


        <TaskList done ={showTaskDone}/>

        </div>
    );
}
export default Home;