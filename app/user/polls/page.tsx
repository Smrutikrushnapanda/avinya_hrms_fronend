"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MoreHorizontal, TrendingUp, Users, Clock, CheckCircle } from "lucide-react";

const initialPollData = {
  id: "6ad04d1b-f2b0-4e95-917d-fde2a8ace2bc",
  title: "Lunch Preference for Saturday",
  description: "Please let us know your lunch preference for Tuesday.",
  questions: [
    {
      id: "3ca84a0d-2460-4915-a908-72aad43312f8",
      question_text: "Will you have lunch at the office?",
      question_type: "single_choice",
      is_required: true,
      options: [
        { id: "0f76763e-9869-4d52-bd7d-e2efb53008ac", option_text: "Yes" },
        { id: "916bcef5-6ec6-4b1b-9599-dcdfc6ca0459", option_text: "No" },
      ],
    },
    {
      id: "5743e4c6-7026-4ef4-9dbf-38ec44316ac4",
      question_text: "Please specify your food preference:",
      question_type: "single_choice",
      is_required: true,
      options: [
        { id: "980e3bdc-98f2-407b-ad31-725d9d647f23", option_text: "Veg" },
        {
          id: "2c2cc100-8189-4632-9a25-a868e8a2d6ca",
          option_text: "Veg (No Onion & Garlic)",
        },
        { id: "a2a2009d-2b51-409a-ac1e-2c1c223b058b", option_text: "Non-Veg" },
        { id: "9e03ab2c-5c22-4f7a-9c17-8585991c444b", option_text: "None" },
      ],
    },
  ],
};

// Mock API fetch
const fetchResponses = async () => {
  const users = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"];
  const randomAnswers = users.map((u) => ({
    user_id: u,
    answers: {
      "3ca84a0d-2460-4915-a908-72aad43312f8": Math.random() > 0.5
        ? "0f76763e-9869-4d52-bd7d-e2efb53008ac"
        : "916bcef5-6ec6-4b1b-9599-dcdfc6ca0459",
      "5743e4c6-7026-4ef4-9dbf-38ec44316ac4": [
        "980e3bdc-98f2-407b-ad31-725d9d647f23",
        "2c2cc100-8189-4632-9a25-a868e8a2d6ca",
        "a2a2009d-2b51-409a-ac1e-2c1c223b058b",
        "9e03ab2c-5c22-4f7a-9c17-8585991c444b",
      ][Math.floor(Math.random() * 4)],
    },
  }));
  return randomAnswers;
};

const getOptionCount = (responses: any[], questionId: string, optionId: string) =>
  responses.filter((r) => r.answers[questionId] === optionId).length;

const getTotalVotes = (responses: any[], questionId: string) =>
  responses.filter((r) => r.answers[questionId]).length;

const mockPollData = [
  {
    id: 1,
    pollNo: "PL240001",
    title: "Lunch Preference for Saturday",
    question: "Will you have lunch at the office?",
    totalVotes: 15,
    createdAt: "18 Aug 2025, 10:45 am",
    status: "ACTIVE"
  },
  {
    id: 2,
    pollNo: "PL240002", 
    title: "Team Building Activity",
    question: "Which activity would you prefer?",
    totalVotes: 23,
    createdAt: "18 Aug 2025, 09:59 am",
    status: "ACTIVE"
  },
  {
    id: 3,
    pollNo: "PL240003",
    title: "Work From Home Policy",
    question: "How many WFH days per week?",
    totalVotes: 42,
    createdAt: "18 Aug 2025, 09:55 am",
    status: "CLOSED"
  },
  {
    id: 4,
    pollNo: "PL240004",
    title: "Office Lunch Menu",
    question: "Preferred cuisine for office lunch?",
    totalVotes: 18,
    createdAt: "18 Aug 2025, 09:49 am",
    status: "ACTIVE"
  },
  {
    id: 5,
    pollNo: "PL240005",
    title: "Meeting Schedule",
    question: "Best time for team meetings?",
    totalVotes: 31,
    createdAt: "18 Aug 2025, 09:38 am",
    status: "CLOSED"
  },
  {
    id: 6,
    pollNo: "PL240006",
    title: "Holiday Planning",
    question: "Preferred vacation destinations?",
    totalVotes: 27,
    createdAt: "18 Aug 2025, 09:38 am",
    status: "ACTIVE"
  },
  {
    id: 7,
    pollNo: "PL240007",
    title: "Training Topics",
    question: "Which skills training interests you?",
    totalVotes: 19,
    createdAt: "18 Aug 2025, 09:34 am",
    status: "DRAFT"
  },
  {
    id: 8,
    pollNo: "PL240008",
    title: "Office Equipment",
    question: "What equipment do you need?",
    totalVotes: 12,
    createdAt: "18 Aug 2025, 09:33 am",
    status: "DRAFT"
  },
  {
    id: 9,
    pollNo: "PL240009",
    title: "Employee Feedback",
    question: "Rate your job satisfaction",
    totalVotes: 38,
    createdAt: "18 Aug 2025, 09:32 am",
    status: "ACTIVE"
  }
];

export default function PollsPage() {
  const [responses, setResponses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchResponses().then(setResponses);
    const interval = setInterval(async () => {
      const newResponses = await fetchResponses();
      setResponses(newResponses);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPolls = mockPollData.length;
  const totalVotes = mockPollData.reduce((sum, poll) => sum + poll.totalVotes, 0);
  const activePolls = mockPollData.filter(poll => poll.status === "ACTIVE").length;

  const filteredPolls = mockPollData.filter(poll =>
    poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    poll.pollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    poll.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">OA</span>
              </div>
              <span className="text-gray-600 text-sm">Polls</span>
            </div>
            <div className="text-2xl font-semibold text-gray-800">Polls</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm">OA</span>
            </div>
            <span className="text-gray-700 font-medium">
                
                Admin</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active Polls</p>
                <p className="text-3xl font-bold text-green-600">{activePolls}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Votes Received</p>
                <p className="text-3xl font-bold text-blue-600">{totalVotes}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Polls Yet to Close</p>
                <p className="text-3xl font-bold text-orange-600">{mockPollData.filter(p => p.status === "DRAFT").length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </motion.div>
        </div>

        {/* Search and Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search polls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="text-gray-600 hover:text-gray-800">
                Columns
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sl. No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Poll No ↕
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title ↕
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question ↕
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Votes ↕
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At ↕
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status ↕
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredPolls.map((poll, index) => (
                    <motion.tr
                      key={poll.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {poll.pollNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={poll.title}>
                          {poll.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={poll.question}>
                          {poll.question}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {poll.totalVotes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {poll.createdAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          poll.status === "ACTIVE" 
                            ? "bg-green-100 text-green-800"
                            : poll.status === "CLOSED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {poll.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        
      </div>
    </div>
  );
}