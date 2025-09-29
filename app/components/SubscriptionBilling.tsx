'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Check, 
  X, 
  AlertTriangle,
  TrendingUp,
  Users,
  HardDrive,
  Zap,
  Shield,
  Globe,
  Bell,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { PageSkeleton } from './SkeletonLoader';

interface SubscriptionBillingProps {
  user: any;
  globalRefreshKey?: number;
}

interface BillingPlan {
  id: string;
  name: string;
  description: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: any;
  limits: any;
  is_popular: boolean;
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  usage_limits: any;
  usage_current: any;
}

interface BillingInvoice {
  id: string;
  invoice_number: string;
  status: string;
  amount: number;
  total_amount: number;
  currency: string;
  due_date: string;
  paid_at: string;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last_four: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  is_active: boolean;
}

interface UsageStats {
  metric_name: string;
  current_usage: number;
  limit_value: number;
  percentage_used: number;
}

export function SubscriptionBilling({ user, globalRefreshKey }: SubscriptionBillingProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingInvoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showBillingAddress, setShowBillingAddress] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadSubscriptionData();
  }, [user?.id, globalRefreshKey]);

  const loadSubscriptionData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get company ID
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (userData?.company_id) {
        setCompanyId(userData.company_id);
        
        // Load all subscription data in parallel
        await Promise.all([
          loadBillingPlans(),
          loadCurrentSubscription(userData.company_id),
          loadUsageStats(userData.company_id),
          loadBillingHistory(userData.company_id),
          loadPaymentMethods(userData.company_id)
        ]);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBillingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      setBillingPlans(data || []);
    } catch (error) {
      console.error('Error loading billing plans:', error);
    }
  };

  const loadCurrentSubscription = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_subscription', { p_company_id: companyId });
      
      if (error) {
        console.error('Error loading subscription:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set null as fallback
        setCurrentSubscription(null);
        return;
      }
      setCurrentSubscription(data?.[0] || null);
    } catch (error) {
      console.error('Error loading subscription:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set null as fallback
      setCurrentSubscription(null);
    }
  };

  const loadUsageStats = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_usage_stats', { p_company_id: companyId });
      
      if (error) {
        console.error('Error loading usage stats:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set empty array as fallback
        setUsageStats([]);
        return;
      }
      setUsageStats(data || []);
    } catch (error) {
      console.error('Error loading usage stats:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set empty array as fallback
      setUsageStats([]);
    }
  };

  const loadBillingHistory = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_billing_history', { p_company_id: companyId, p_limit: 10 });
      
      if (error) {
        console.error('Error loading billing history:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set empty array as fallback
        setBillingHistory([]);
        return;
      }
      setBillingHistory(data || []);
    } catch (error) {
      console.error('Error loading billing history:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set empty array as fallback
      setBillingHistory([]);
    }
  };

  const loadPaymentMethods = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your subscription, billing, and payment methods</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current Subscription */}
          {currentSubscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Subscription
                </CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{currentSubscription.plan_type} Plan</h3>
                    <Badge className={`mt-2 ${getStatusColor(currentSubscription.status)}`}>
                      {currentSubscription.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Next billing: {formatDate(currentSubscription.current_period_end)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Billing Period</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(currentSubscription.current_period_start)} - {formatDate(currentSubscription.current_period_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Invoice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage This Month
              </CardTitle>
              <CardDescription>Track your current usage against plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {usageStats.map((stat) => (
                  <div key={stat.metric_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {stat.metric_name === 'interviews_per_month' && <Zap className="h-4 w-4 text-blue-600" />}
                        {stat.metric_name === 'users' && <Users className="h-4 w-4 text-green-600" />}
                        {stat.metric_name === 'storage_gb' && <HardDrive className="h-4 w-4 text-orange-600" />}
                        <span className="font-medium capitalize">
                          {stat.metric_name.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {stat.current_usage} / {stat.limit_value}
                      </span>
                    </div>
                    <Progress 
                      value={stat.percentage_used} 
                      className="h-2"
                      style={{
                        backgroundColor: stat.percentage_used > 90 ? '#fef2f2' : '#f3f4f6'
                      }}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{stat.percentage_used.toFixed(1)}% used</span>
                      {stat.percentage_used > 90 && (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Near limit
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Update Payment</h3>
                    <p className="text-sm text-muted-foreground">Manage payment methods</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Download Invoices</h3>
                    <p className="text-sm text-muted-foreground">Get billing history</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Billing Settings</h3>
                    <p className="text-sm text-muted-foreground">Configure preferences</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {billingPlans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'ring-2 ring-blue-500' : ''}`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.price_monthly)}
                    </div>
                    <div className="text-sm text-muted-foreground">per month</div>
                    <div className="text-sm text-green-600 mt-1">
                      Save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}% with yearly billing
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {Object.entries(plan.features).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value === true ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : value === false ? (
                          <X className="h-4 w-4 text-gray-400" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{String(value)}</span>
                        )}
                        <span className="text-sm capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant={plan.is_popular ? "default" : "outline"}
                    disabled={currentSubscription?.plan_type === plan.plan_type}
                  >
                    {currentSubscription?.plan_type === plan.plan_type ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <div className="text-muted-foreground font-medium">No billing history</div>
                    <div className="text-sm text-muted-foreground mt-1">Invoices will appear here once you start using the service</div>
                  </div>
                ) : (
                  billingHistory.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Download className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">Invoice #{invoice.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(invoice.total_amount, invoice.currency)}</div>
                          <Badge className={`mt-1 ${getInvoiceStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Manage your payment methods and billing information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <div className="text-muted-foreground font-medium">No payment methods</div>
                    <div className="text-sm text-muted-foreground mt-1">Add a payment method to get started</div>
                    <Button className="mt-4" onClick={() => setShowAddPaymentMethod(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                ) : (
                  <>
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <CreditCard className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {method.brand?.toUpperCase()} •••• {method.last_four}
                              {method.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Expires {method.exp_month}/{method.exp_year}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => setShowAddPaymentMethod(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Billing Address
              </CardTitle>
              <CardDescription>Your billing address for invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-medium">No billing address set</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Add a billing address for accurate invoicing
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowBillingAddress(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Billing Address
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddPaymentMethod} onOpenChange={setShowAddPaymentMethod}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method for your subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Payment method integration will be implemented with Stripe
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddPaymentMethod(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled>
                Add Method
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Billing Address Dialog */}
      <Dialog open={showBillingAddress} onOpenChange={setShowBillingAddress}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Billing Address</DialogTitle>
            <DialogDescription>
              Add your billing address for invoices
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" />
              </div>
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="Your Company" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="New York" />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="NY" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" placeholder="10001" />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowBillingAddress(false)}>
                Cancel
              </Button>
              <Button className="flex-1">
                Save Address
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
