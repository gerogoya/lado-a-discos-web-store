"use client";

import Link from "next/link";
import { KeyRound, Lock, UserCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { publicAsset } from "@/lib/assets";
import { storeConfig } from "@/lib/store-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function AcceptInvitePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [status, setStatus] = useState<"checking" | "ready" | "saving" | "success" | "error">("checking");
  const [message, setMessage] = useState("Estamos verificando el link de invitacion.");

  useEffect(() => {
    let cancelled = false;

    async function loadInvitationSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw error;
          }

          window.history.replaceState(null, "", `${basePath}/admin/accept-invite/`);
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session) {
          if (!cancelled) {
            setStatus("error");
            setMessage("El link de invitacion expiro o no incluye una sesion valida.");
          }
          return;
        }

        const { data: userData } = await supabase.auth.getUser();

        if (!cancelled) {
          setEmail(userData.user?.email ?? "");
          setStatus("ready");
          setMessage("Crea una contrasena para poder entrar al panel admin.");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(getErrorMessage(error, "No se pudo verificar el link de invitacion."));
        }
      }
    }

    loadInvitationSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setStatus("ready");
      setMessage("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setStatus("ready");
      setMessage("Las contrasenas no coinciden.");
      return;
    }

    setStatus("saving");
    setMessage("Guardando contrasena.");

    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({
        password
      });

      if (error) {
        throw error;
      }

      window.localStorage.setItem(storeConfig.adminStorageKey, "true");
      setStatus("success");
      setMessage("Contrasena creada. Redirigiendo al admin.");
      window.setTimeout(() => {
        window.location.assign(`${basePath}/admin/`);
      }, 900);
    } catch (error) {
      setStatus("ready");
      setMessage(getErrorMessage(error, "No se pudo guardar la contrasena."));
    }
  }

  return (
    <main className="admin-login">
      <form className="login-card" onSubmit={submitPassword}>
        <ProductImage src={publicAsset("/brand/lado-a-discos-logo.jpg")} alt="LADO A DISCOS" width={88} height={88} priority />
        <div>
          <p className="eyebrow">Invitacion admin</p>
          <h1>Crear acceso</h1>
          <p>{email ? `Cuenta invitada: ${email}` : "Completa el acceso para LADO A DISCOS."}</p>
        </div>

        <p className={`admin-message ${status === "error" ? "error" : ""}`}>{message}</p>

        {status === "ready" || status === "saving" ? (
          <>
            <label>
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nueva contrasena"
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              <KeyRound size={18} />
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Repetir contrasena"
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button className="primary-action" type="submit" disabled={status === "saving"}>
              <UserCheck size={18} />
              {status === "saving" ? "Guardando..." : "Crear acceso"}
            </button>
          </>
        ) : null}

        {status === "error" ? <Link href="/admin">Volver al login</Link> : null}
      </form>
    </main>
  );
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}
