"use client";

import { ConnectionTemplateDictionary } from "@/components/connection-config-editor/template";
import { MySQLIcon, SQLiteIcon } from "@/components/icons/outerbase-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import NavigationLayout from "../nav-layout";
import { ResourceItemList, ResourceItemProps } from "../resource-item-helper";
import { deleteLocalBaseDialog } from "./dialog-base-delete";
import { createLocalBoardDialog } from "./dialog-board-create";
import { deleteLocalBoardDialog } from "./dialog-board-delete";
import {
  createLocalConnection,
  getLocalConnectionList,
  useLocalConnectionList,
  useLocalDashboardList,
} from "./hooks";

export default function LocalConnectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);

  const {
    data: localBases,
    isLoading,
    mutate: refreshBase,
  } = useLocalConnectionList();

  const baseResources = useMemo(() => {
    return (localBases ?? []).map((conn) => {
      return {
        href:
          conn.content.driver === "sqlite-filehandler"
            ? `/playground/client?s=${conn.id}`
            : `/client/s/${conn.content.driver ?? "turso"}?p=${conn.id}`,
        name: conn.content.name,
        lastUsed: conn.updated_at,
        id: conn.id,
        type: conn.content.driver,
        status: "",
        color: conn.content.label || "default",
      } as ResourceItemProps;
    });
  }, [localBases]);

  // Getting the board from indexdb
  const { data: dashboardList, mutate: refreshDashboard } =
    useLocalDashboardList();
  const dashboardResources = useMemo(() => {
    return (
      (dashboardList ?? []).map((board) => {
        return {
          href: `/local/board/${board.id}`,
          name: board.content.name,
          lastUsed: board.content.updated_at,
          id: board.id,
          type: "board",
        } as ResourceItemProps;
      }) ?? []
    );
  }, [dashboardList]);

  const onBoardCreate = useCallback(() => {
    createLocalBoardDialog.show({}).then(() => {
      refreshDashboard();
    });
  }, [refreshDashboard]);

  const onBaseRemove = useCallback(
    (deletedResource: ResourceItemProps) => {
      deleteLocalBaseDialog
        .show({ baseId: deletedResource.id, baseName: deletedResource.name })
        .then(refreshBase)
        .catch();
    },
    [refreshBase]
  );

  const onBoardRemove = useCallback((deletedResource: ResourceItemProps) => {
    deleteLocalBoardDialog
      .show({ boardId: deletedResource.id, boardName: deletedResource.name })
      .then()
      .catch();
  }, []);

  useEffect(() => {
    const dbName = searchParams.get("dbName");
    const host = searchParams.get("host") ?? searchParams.get("url") ?? "";
    const token =
      searchParams.get("token") ?? searchParams.get("access-key") ?? "";
    const driver = searchParams.get("driver") ?? "turso";
    if (!dbName) return;
    setProcessing(true);
    (async () => {
      const allConnections = await getLocalConnectionList();
      const match = allConnections.find(
        (conn) => conn.content?.name?.toLowerCase() === dbName.toLowerCase()
      );
      if (match) {
        const url =
          match.content.driver === "sqlite-filehandler"
            ? `/playground/client?s=${match.id}`
            : `/client/s/${match.content.driver ?? "turso"}?p=${match.id}`;
        router.replace(url);
        return;
      }
      // Create new connection
      const template = ConnectionTemplateDictionary[driver];
      if (!template?.localTo) {
        setProcessing(false);
        return;
      }
      const config = template.localTo({
        name: dbName,
        host,
        token,
        ...(driver === "starbase"
          ? { starbase_type: searchParams.get("type") ?? "internal" }
          : {}),
      });
      const newConn = await createLocalConnection(config);
      const url =
        newConn.content.driver === "sqlite-filehandler"
          ? `/playground/client?s=${newConn.id}`
          : `/client/s/${newConn.content.driver ?? "turso"}?p=${newConn.id}`;
      router.replace(url);
    })();
  }, [router, searchParams]);

  if (processing) {
    return (
      <NavigationLayout>
        <div className="flex flex-1 items-center justify-center p-8 text-lg">
          Processing database connection...
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="flex flex-1 flex-col content-start gap-4 overflow-x-hidden overflow-y-auto p-4">
        <div className="mb-4 flex gap-4">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="bg-background dark:bg-secondary flex cursor-pointer items-center gap-2 rounded-lg border p-4">
                <SQLiteIcon className="h-10 w-10" />
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-base font-bold">SQLite Playground</span>
                  <span className="text-sm">
                    Launch in-memory SQLite on browser
                  </span>
                </div>
                <CaretDown className="ml-4 h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="flex w-[500px] flex-col gap-4 p-4"
              align="start"
            >
              <Link
                href="/playground/client"
                className="bg-secondary hover:bg-primary hover:text-primary-foreground flex cursor-pointer flex-col gap-2 rounded p-2 py-4 text-base font-bold"
              >
                Open Empty SQLite Database
              </Link>

              <div className="flex gap-4">
                <Link
                  href="/playground/client?template=northwind"
                  className="bg-secondary hover:bg-primary hover:text-primary-foreground flex cursor-pointer flex-col gap-2 rounded p-2 text-left text-base"
                >
                  <span className="font-bold">Northwind</span>
                  <span className="text-sm">
                    The Northwind Database is a sample business database for
                    learning SQL queries and database design.
                  </span>
                </Link>

                <Link
                  href="/playground/client?template=chinook"
                  className="bg-secondary hover:bg-primary hover:text-primary-foreground flex cursor-pointer flex-col gap-2 rounded p-2 text-left text-base"
                >
                  <span className="font-bold">Chinook</span>
                  <span className="text-sm">
                    The Chinook Database is a sample digital media store
                    database for learning and practicing SQL queries.
                  </span>
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="bg-background dark:bg-secondary flex cursor-pointer items-center gap-2 rounded-lg border p-4"
            onClick={() => {
              // Random 8 character alphabeth string
              const roomName = new Array(8)
                .fill("a")
                .map(
                  () =>
                    "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
                )
                .join("");

              router.push(`/playground/mysql/${roomName}`);
            }}
          >
            <MySQLIcon className="h-10 w-10" />
            <div className="flex flex-col gap-1 text-left">
              <span className="text-base font-bold">MySQL Playgorund</span>
              <span className="text-sm">
                Spin up cloud MySQL sandbox instance
              </span>
            </div>
          </button>
        </div>

        <ResourceItemList
          boards={dashboardResources}
          bases={baseResources ?? []}
          loading={isLoading}
          onBoardRemove={onBoardRemove}
          onBaseRemove={onBaseRemove}
          onBaseEdit={(resource) => {
            router.push(`/local/edit-base/${resource.id}`);
          }}
          onBoardCreate={onBoardCreate}
        />
      </div>
    </NavigationLayout>
  );
}
