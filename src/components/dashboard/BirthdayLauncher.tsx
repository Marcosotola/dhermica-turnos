'use client';

import { useAuth } from "@/lib/contexts/AuthContext";
import { BirthdayModal } from "./BirthdayModal";

export function BirthdayLauncher() {
    const { profile } = useAuth();
    return profile ? <BirthdayModal user={profile} /> : null;
}
