import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { Activity, DollarSign, ShoppingBag, Users, TrendingUp, Calendar, Download, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OrderData, MonthlySalesData, GameStats, UserActivityData } from '../types';

const COLORS = ['#8b5cf6', '#f97316', '#0ea5e9', '#10b981', '#ef4444', '#fbbf24'];

export const Dashboard: React.FC = () => {
  const [totalSales, setTotalSales] = useState<number | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesData[]>([]);
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityData[]>([]);
  const [latestOrders, setLatestOrders] = useState<OrderData[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized data processing functions
  const processMonthlyData = useCallback((orders: OrderData[]) => {
    const monthlyData: Record<string, { totalAmount: number; orderCount: number }> = {};
    orders.forEach((order) => {
      const date = new Date(order.orderDate || order.createdAt || '');
      if (isNaN(date.getTime())) return;
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { totalAmount: 0, orderCount: 0 };
      }

      monthlyData[monthYear].totalAmount += (order.amount || 0);
      monthlyData[monthYear].orderCount += 1;
    });

    return Object.keys(monthlyData)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(month => ({
        month,
        totalAmount: parseFloat(monthlyData[month].totalAmount.toFixed(2)),
        orderCount: monthlyData[month].orderCount
      }));
  }, []);

  const processGameStats = useCallback((orders: OrderData[]) => {
    const games: Record<string, { totalAmount: number; orderCount: number }> = {};
    orders.forEach((order) => {
      if (!order.game) return;

      if (!games[order.game]) {
        games[order.game] = { totalAmount: 0, orderCount: 0 };
      }

      games[order.game].totalAmount += (order.amount || 0);
      games[order.game].orderCount += 1;
    });

    const gameStatsTotal = Object.values(games).reduce((total, game) => total + game.totalAmount, 0);

    return Object.keys(games)
      .map(game => ({
        game,
        totalAmount: parseFloat(games[game].totalAmount.toFixed(2)),
        orderCount: games[game].orderCount,
        percentage: parseFloat(((games[game].totalAmount / gameStatsTotal) * 100).toFixed(2))
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, []);

  const processUserActivity = useCallback((orders: OrderData[]) => {
    const userData: Record<string, Set<string>> = {};
    orders.forEach((order) => {
      const date = new Date(order.orderDate || order.createdAt || '');
      if (isNaN(date.getTime())) return;
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!userData[monthYear]) {
        userData[monthYear] = new Set();
      }
      userData[monthYear].add(order.userId);
    });

    return Object.keys(userData)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(month => ({
        month,
        uniqueUsers: userData[month].size
      }));
  }, []);

  // Search orders
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredOrders(latestOrders);
      return;
    }
    const lowerTerm = term.toLowerCase();
    const filtered = latestOrders.filter(order =>
      order.game?.toLowerCase().includes(lowerTerm) ||
      order.userId.toLowerCase().includes(lowerTerm) ||
      order.item.toLowerCase().includes(lowerTerm)
    );
    setFilteredOrders(filtered);
  }, [latestOrders]);

  // Dynamic color generation for Pie Chart
  const generateColor = (index: number, total: number) => {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Export data as CSV
  const exportToCSV = () => {
    const headers = ['Month,Revenue,Orders,Unique Users,Game,Game Revenue,Game Orders,Game Percentage'];
    const monthlyRows = monthlySales.map(m => `${m.month},${m.totalAmount},${m.orderCount},${userActivity.find(u => u.month === m.month)?.uniqueUsers || 0}`);
    const gameRows = gameStats.map(g => `,${g.game},${g.totalAmount},${g.orderCount},${g.percentage}`);
    const csvContent = [...headers, ...monthlyRows, ...gameRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let mounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch total count of all sent_messages
        const { count: totalCount, error: countError } = await supabase
          .from('sent_messages')
          .select('*', { count: 'exact', head: true });

        if (countError) throw new Error(`Supabase count error: ${countError.message}`);
        setTotalOrders(totalCount ? Math.floor(totalCount / 2) : 0);

        // Fetch messages with "Top up successful✅"
        const { data: messagesData, error } = await supabase
          .from('sent_messages')
          .select('*')
          .ilike('message', '%Top up successful✅%')
          .order('sent_at', { ascending: false });

        if (error) throw new Error(`Supabase error: ${error.message}`);

        if (messagesData && messagesData.length > 0) {
          const orderData: OrderData[] = messagesData
            .map((message, index) => {
              const messageText = message.message;
              const transactionMatch = messageText.match(/Transaction: (tb\d+)/);
              const gameMatch = messageText.match(/Game: ([^\n]+)/);
              const amountMatch = messageText.match(/Amount: (\d+\.\d{2}) \$/);
              const itemMatch = messageText.match(/Item: ([^\n]+)/);
              const userIdMatch = messageText.match(/User ID: (\d+)/);
              const orderIdMatch = messageText.match(/Order ID: (S\d+)/);
              const orderDateMatch = messageText.match(/Order Date: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2})/);

              if (!transactionMatch || !amountMatch) {
                console.warn(`Skipping malformed message at index ${index}: ${messageText}`);
                return null;
              }

              return {
                id: message.id,
                transactionId: transactionMatch[1],
                game: gameMatch ? gameMatch[1] : 'Unknown',
                amount: parseFloat(amountMatch[1]),
                item: itemMatch ? itemMatch[1] : 'N/A',
                userId: userIdMatch ? userIdMatch[1] : 'Anonymous',
                orderId: orderIdMatch ? orderIdMatch[1] : `order-${message.id}`,
                orderDate: orderDateMatch ? orderDateMatch[1] : message.sent_at,
                createdAt: message.sent_at
              };
            })
            .filter((order): order is OrderData => order !== null);

          const totalAmount = orderData.reduce((sum, order) => sum + (order.amount || 0), 0);
          setTotalSales(totalAmount);
          setMonthlySales(processMonthlyData(orderData));
          setGameStats(processGameStats(orderData));
          setUserActivity(processUserActivity(orderData));
          setLatestOrders(orderData);
          setFilteredOrders(orderData); // Initialize filtered orders
        } else {
          setTotalSales(0);
          setMonthlySales([]);
          setGameStats([]);
          setUserActivity([]);
          setLatestOrders([]);
          setFilteredOrders([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, [processMonthlyData, processGameStats, processUserActivity]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown Date';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (active && payload && payload.length) {
      if (type === 'monthly') {
        const prevMonth = monthlySales[monthlySales.findIndex(m => m.month === label) - 1];
        const revenueChange = prevMonth ? ((payload[0].value - prevMonth.totalAmount) / prevMonth.totalAmount * 100).toFixed(1) : null;
        return (
          <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-md">
            <p className="font-semibold">{label}</p>
            <p className="text-blue-500">Revenue: {formatCurrency(payload[0].value)}</p>
            <p className="text-orange-500">Orders: {payload[1].value}</p>
            {revenueChange && (
              <p className={revenueChange > 0 ? 'text-green-500' : 'text-red-500'}>
                Change: {revenueChange}% {revenueChange > 0 ? '↑' : '↓'}
              </p>
            )}
          </div>
        );
      } else if (type === 'game') {
        return (
          <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-md">
            <p className="font-semibold">{payload[0].name}</p>
            <p className="text-blue-500">Revenue: {formatCurrency(payload[0].value)}</p>
            <p className="text-orange-500">Orders: {payload[0].payload.orderCount}</p>
            <p className="text-green-500">Share: {payload[0].payload.percentage}%</p>
          </div>
        );
      } else if (type === 'users') {
        const prevMonth = userActivity[userActivity.findIndex(u => u.month === label) - 1];
        const userChange = prevMonth ? ((payload[0].value - prevMonth.uniqueUsers) / prevMonth.uniqueUsers * 100).toFixed(1) : null;
        return (
          <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-md">
            <p className="font-semibold">{label}</p>
            <p className="text-teal-500">Unique Users: {payload[0].value}</p>
            {userChange && (
              <p className={userChange > 0 ? 'text-green-500' : 'text-red-500'}>
                Change: {userChange}% {userChange > 0 ? '↑' : '↓'}
              </p>
            )}
          </div>
        );
      }
    }
    return null;
  };

  if (error) {
    return (
      <div className="animate-fade-in p-4 text-red-500">
        Error: {error}. Please try again later or check your connection.
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sales Dashboard</h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          <Download className="h-5 w-5" />
          Export Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: 'Total Revenue',
            value: totalSales !== null ? formatCurrency(totalSales) : '$0.00',
            icon: <DollarSign className="h-5 w-5 text-blue-500" />,
            subtext: 'Lifetime revenue',
            loadingWidth: 'w-24'
          },
          {
            title: 'Total Orders',
            value: totalOrders || 0,
            icon: <ShoppingBag className="h-5 w-5 text-indigo-500" />,
            subtext: 'Total orders processed',
            loadingWidth: 'w-16'
          },
          {
            title: 'Avg. Order Value',
            value: totalSales !== null && totalOrders !== null && totalOrders > 0
              ? formatCurrency(totalSales / totalOrders)
              : '$0.00',
            icon: <Activity className="h-5 w-5 text-orange-500" />,
            subtext: 'Average per order',
            loadingWidth: 'w-20'
          },
          {
            title: 'Active Users',
            value: latestOrders.length > 0
              ? new Set(latestOrders.map(order => order.userId)).size
              : 0,
            icon: <Users className="h-5 w-5 text-teal-500" />,
            subtext: 'Unique users',
            loadingWidth: 'w-16'
          }
        ].map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                {loading ? (
                  <div className={`h-8 ${card.loadingWidth} bg-gray-200 rounded animate-pulse mt-2`} />
                ) : (
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                )}
              </div>
              {card.icon}
            </div>
            <p className="text-xs text-gray-500 mt-2">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales */}
        <div className="bg-white rounded-lg shadow p-4 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Monthly Sales Overview</h3>
          </div>
          {loading ? (
            <div className="h-80 w-full bg-gray-200 rounded animate-pulse" />
          ) : monthlySales.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" />
                  <Tooltip content={props => <CustomTooltip {...props} type="monthly" />} />
                  <Bar yAxisId="left" dataKey="totalAmount" name="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="orderCount" name="Orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center">
              <Calendar className="h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">No monthly sales data available</p>
            </div>
          )}
        </div>

        {/* User Activity Trend */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-teal-500" />
            <h3 className="font-semibold">User Activity Trend</h3>
          </div>
          {loading ? (
            <div className="h-60 w-full bg-gray-200 rounded animate-pulse" />
          ) : userActivity.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={props => <CustomTooltip {...props} type="users" />} />
                  <Line type="monotone" dataKey="uniqueUsers" name="Unique Users" stroke="#14b8a6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center">
              <Users className="h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">No user activity data available</p>
            </div>
          )}
        </div>

        {/* Game Distribution */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold">Sales by Game</h3>
          </div>
          {loading ? (
            <div className="h-60 w-full bg-gray-200 rounded animate-pulse" />
          ) : gameStats.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gameStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="totalAmount"
                    nameKey="game"
                    label={({ game, percentage }) => `${game}: ${percentage}%`}
                  >
                    {gameStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={generateColor(index, gameStats.length)} />
                    ))}
                  </Pie>
                  <Tooltip content={props => <CustomTooltip {...props} type="game" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center">
              <ShoppingBag className="h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">No game statistics available</p>
            </div>
          )}
        </div>

        {/* Latest Orders */}
        <div className="bg-white rounded-lg shadow p-4 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Latest Orders</h3>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredOrders.slice(0, showAllOrders ? undefined : 5).map((order, index) => (
                <div 
                  key={order.transactionId || index} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${order.game.toLowerCase() === 'mlbb' ? 'bg-purple-100' : 'bg-orange-100'}`}>
                      <ShoppingBag className={`h-4 w-4 ${order.game.toLowerCase() === 'mlbb' ? 'text-purple-600' : 'text-orange-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {order.game?.toUpperCase()} - {order.item}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.userId} • {formatDate(order.orderDate || order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(order.amount)}</p>
                </div>
              ))}
              {filteredOrders.length > 5 && (
                <button
                  onClick={() => setShowAllOrders(!showAllOrders)}
                  className="w-full text-blue-500 hover:text-blue-600 text-sm font-medium mt-2"
                >
                  {showAllOrders ? 'Show Less' : 'View More'}
                </button>
              )}
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center">
              <Activity className="h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
