import { useEffect, useState } from "react";
import { supabase } from '../supabase/client';
import { useNavigate } from "react-router-dom";

function Login() {

    const [email, setEmail] = useState("");
    const navigate= useNavigate();

    const handleSubmit = async (e) => { 
        e.preventDefault();
        try {
            const result = await supabase.auth.signInWithOtp({
                email,
            });
            console.log(result)
        } catch (error) {
            console.error(error);
        } 
    };
    
    useEffect(()=>{
    if(supabase.auth.getUser()){
        navigate ("/");
    }
    },[navigate]);

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    name="email"
                    placeholder="Escribe tu Email"
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button>
                    Enviar
                </button>
            </form>
        </div>

    )
}
export default Login