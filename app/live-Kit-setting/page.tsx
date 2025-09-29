"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LiveKitSettingsPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">LiveKit Settings</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connection Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Server URL</Label>
            <Input id="serverUrl" placeholder="https://your-livekit.example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" placeholder="LK..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input id="apiSecret" type="password" placeholder="••••••••" />
          </div>
          <div className="pt-2">
            <Button className="w-full">Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

