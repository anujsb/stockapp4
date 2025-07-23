"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { IconHome2, IconChartBar, IconEye, IconNews, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { SignedIn, UserButton } from "@clerk/nextjs";

export function SideBar() {
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <IconHome2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Portfolio",
      href: "/portfolio",
      icon: <IconChartBar className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    // {
    //   label: "Add Stock",
    //   href: "/portfolio",
    //   icon: <IconPlus className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    // },
    {
      label: "Watchlist",
      href: "/watchlist",
      icon: <IconEye className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Market News",
      href: "/news",
      icon: <IconNews className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Recommendations",
      href: "/recommendations",
      icon: <IconNews className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
  ];

  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <nav className="mt-8 flex flex-col gap-2" aria-label="Sidebar navigation">
              {links.map((link, idx) => (
                <SidebarLink
                  key={idx}
                  link={link}
                  className={`${pathname === link.href
                      ? "bg-secondary px-1 rounded-lg"
                      : "bg-transparent px-1 rounded-lg"
                    }`}
                  aria-current={pathname === link.href ? "page" : undefined}
                />
              ))}
            </nav>
          </div>
          <div>
            {/* <SidebarLink
              link={{
                label: "21bubbles",
                href: "https://21bubbles.com/",
                icon: (
                  <Image
                    src="/favicon.ico"
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                    width={50}
                    height={50}
                    alt="21bubbles logo"
                    aria-hidden="true"
                  />
                ),
              }}
              aria-label="Visit 21bubbles website"
            /> */}
            <div className="">
              <SignedIn>
                <UserButton />
                {/* Your profile  */}
              </SignedIn>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center py-1 relative z-20"
      aria-label="StockApp Dashboard home"
    >
      <div
        className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center"
        aria-hidden="true"
      >
        <IconChartBar className="text-white w-5 h-5" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold whitespace-pre text-lg text-blue-700"
      >
        StockApp
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <div
      className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center"
      aria-label="StockApp logo"
    >
      <IconChartBar className="text-white w-5 h-5" />
    </div>
  );
};