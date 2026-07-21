"use client";
import { createContext, useContext } from "react";

export const GuestContext = createContext(false);
export function useGuest() { return useContext(GuestContext); }
