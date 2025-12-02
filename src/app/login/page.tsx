"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {

  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });

      // if (response.redirected) {
      //   window.location.href = response.url;
      //   return;
      // }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      // If successful but no redirect happened (shouldn't happen based on logic but safe to keep)
      // router.push("/");
      await login();
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Branding & Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 text-white flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            <span>DASHBOARD PARTNERSHIP</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight">
            Efficient Documents Management for Partnership Division
          </h2>
          <p className="text-slate-300 text-lg">
            Streamline your operations with our integrated module designed for performance and reliability.
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          © 2024 PT. Telkom Satelit Indonesia. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {/* <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Forgot password?
                  </a> */}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 pr-10 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg shadow-blue-600/20"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="lg:hidden text-center text-sm text-slate-500 mt-8">
            © 2024 PT. Telkom Satelit Indonesia
          </div>
        </div>
      </div>
    </div>
  );
}

// // src/app/login/page.tsx
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Eye, EyeOff, Loader2 } from "lucide-react";

// export default function LoginPage() {
//   const router = useRouter();
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const response = await fetch("/api/auth/login", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ username, password }),
//         credentials: "include"
//       });

//       // kalau API redirect, browser tidak otomatis follow-nya di fetch
//     if (response.redirected) {
//         window.location.href = response.url; // follow manual
//         return;
//     }

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Login failed");
//       }
      

//       // Redirect to dashboard or home page
//     //   router.push("/jik-module");
//     } catch (err: any) {
//       setError(err.message || "An error occurred during login");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
//       <div className="w-full max-w-md">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
//             JIK Module
//           </h1>
//           <p className="text-slate-600 dark:text-slate-400 mt-2">
//             Sign in to continue to your account
//           </p>
//         </div>

//         <Card className="border-slate-200 dark:border-slate-800 shadow-xl">
//           <CardHeader className="space-y-1">
//             <CardTitle className="text-2xl font-bold">Login</CardTitle>
//             <CardDescription>
//               Enter your Username and password to access your account
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               {error && (
//                 <Alert variant="destructive">
//                   <AlertDescription>{error}</AlertDescription>
//                 </Alert>
//               )}

//               <div className="space-y-2">
//                 <Label htmlFor="username">Username</Label>
//                 <Input
//                   id="username"
//                   type="text"
//                   placeholder="username"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   required
//                   disabled={loading}
//                   className="h-11"
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="password">Password</Label>
//                 <div className="relative">
//                   <Input
//                     id="password"
//                     type={showPassword ? "text" : "password"}
//                     placeholder="••••••••"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                     disabled={loading}
//                     className="h-11 pr-10"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
//                     disabled={loading}
//                   >
//                     {showPassword ? (
//                       <EyeOff className="h-4 w-4" />
//                     ) : (
//                       <Eye className="h-4 w-4" />
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <Button
//                 type="submit"
//                 className="w-full h-11 text-base font-medium"
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Signing in...
//                   </>
//                 ) : (
//                   "Sign In"
//                 )}
//               </Button>
//             </form>
//           </CardContent>
//         </Card>

//         <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4">
//           © 2024 PT. Telkom Satelit Indonesia. All rights reserved.
//         </p>
//       </div>
//     </div>
//   );
// }