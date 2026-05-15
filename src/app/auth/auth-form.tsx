"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Zadejte platný e-mail"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});

const registerSchema = z.object({
  display_name: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  email: z.string().email("Zadejte platný e-mail"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function handleLogin(values: LoginValues) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (error) {
      toast.error("Přihlášení selhalo", { description: error.message });
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleRegister(values: RegisterValues) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.display_name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registrace selhala", { description: error.message });
      return;
    }
    if (data.session) {
      toast.success("Účet vytvořen! Přihlašuji vás...");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.info("Potvrďte e-mail", {
        description: "Zkontrolujte e-mailovou schránku a klikněte na potvrzovací odkaz.",
        duration: 8000,
      });
    }
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-12">
        <TabsTrigger value="login" className="text-sm">Přihlásit se</TabsTrigger>
        <TabsTrigger value="register" className="text-sm">Registrovat se</TabsTrigger>
      </TabsList>

      {/* Login */}
      <TabsContent value="login">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Přihlášení</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="vas@email.cz"
                  className="h-12 text-base"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Heslo</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••"
                  className="h-12 text-base"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Přihlašuji..." : "Přihlásit se"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Register */}
      <TabsContent value="register">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nový účet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Přezdívka</Label>
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="Rybář Karel"
                  className="h-12 text-base"
                  {...registerForm.register("display_name")}
                />
                {registerForm.formState.errors.display_name && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.display_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="vas@email.cz"
                  className="h-12 text-base"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Heslo</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="min. 6 znaků"
                  className="h-12 text-base"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Vytvářím účet..." : "Vytvořit účet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
