import "server-only";
import { cookies } from "next/headers";
import {
  customerDemoCookie,
  decodeCustomerDemo,
  encodeCustomerDemo,
  type CustomerDemoProfile,
} from "./customer-demo-session";

export async function getCustomerDemo() {
  return decodeCustomerDemo((await cookies()).get(customerDemoCookie)?.value);
}
export async function saveCustomerDemo(profile: CustomerDemoProfile) {
  (await cookies()).set(customerDemoCookie, encodeCustomerDemo(profile), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((profile.expires - Date.now()) / 1000)),
  });
}
export async function clearCustomerDemo() {
  (await cookies()).set(customerDemoCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
