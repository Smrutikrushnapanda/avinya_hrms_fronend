"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UserDashboardPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
       const res = await axios.get(`/users/${params.id}`);
        setUser(res.data);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false); 
      }
    };
    fetchUser();
  }, [params.id]);

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Profile */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>👤 Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>📅 Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="border p-2 rounded bg-green-50">Present: 20 Days</li>
            <li className="border p-2 rounded bg-red-50">Absent: 2 Days</li>
            <li className="border p-2 rounded bg-yellow-50">Half Day: 1</li>
          </ul>
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>🎉 Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="border p-2 rounded bg-blue-50">Aug 15 – Independence Day</li>
            <li className="border p-2 rounded bg-blue-50">Aug 19 – Raksha Bandhan</li>
            <li className="border p-2 rounded bg-blue-50">Oct 2 – Gandhi Jayanti</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
