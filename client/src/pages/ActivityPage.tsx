import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, Users, GitMerge, AlertTriangle, CheckCircle, 
  XCircle, Clock, RefreshCw, UserPlus,
  Link2, Trash2, Edit3, Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  changes: Record<string, unknown>;
  createdAt: string;
  user: { email: string; firstName: string } | null;
  message: string;
}

interface ActivityStats {
  byAction: { action: string; count: number; last_activity: string }[];
  topContributors: { email: string; first_name: string; action_count: number }[];
  byDay: { date: string; count: number }[];
}

interface DuplicateCandidate {
  person1: { id: string; firstName: string; lastName: string; birthDate: string; birthplace: string };
  person2: { id: string; firstName: string; lastName: string; birthDate: string; birthplace: string };
  confidence: number;
  matchReasons: string[];
}

interface ChangeRequest {
  id: string;
  request_type: string;
  status: string;
  created_at: string;
  from_family_name?: string;
  to_family_name?: string;
  requester_name?: string;
  notes: string;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <UserPlus className="h-4 w-4 text-green-500" />,
  UPDATE: <Edit3 className="h-4 w-4 text-blue-500" />,
  DELETE: <Trash2 className="h-4 w-4 text-red-500" />,
  LINK_PARENT: <Link2 className="h-4 w-4 text-purple-500" />,
  LINK_SPOUSE: <Link2 className="h-4 w-4 text-pink-500" />,
  MERGE: <GitMerge className="h-4 w-4 text-orange-500" />,
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergeDialog, setMergeDialog] = useState<{ open: boolean; dup: DuplicateCandidate | null }>({ open: false, dup: null });

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [activityRes, statsRes, dupsRes, requestsRes] = await Promise.all([
        fetch(`${API}/collaboration/activity?limit=30`, { headers }),
        fetch(`${API}/collaboration/activity/stats`, { headers }),
        fetch(`${API}/collaboration/duplicates/find`, { headers }),
        fetch(`${API}/collaboration/requests?direction=incoming`, { headers })
      ]);

      if (activityRes.ok) setActivities(await activityRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (dupsRes.ok) setDuplicates(await dupsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (person1Id: string, person2Id: string) => {
    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const res = await fetch(`${API}/collaboration/duplicates/merge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ person1Id, person2Id })
      });
      
      if (res.ok) {
        setMergeDialog({ open: false, dup: null });
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to merge:', err);
    }
  };

  const handleRequestResponse = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      await fetch(`${API}/collaboration/requests/${requestId}/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      });
      
      fetchAllData();
    } catch (err) {
      console.error('Failed to respond:', err);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity & Collaboration</h1>
          <p className="text-muted-foreground">Track changes and manage duplicates</p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-muted-foreground" />
              {stats?.byAction.reduce((sum, a) => sum + parseInt(String(a.count)), 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contributors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-muted-foreground" />
              {stats?.topContributors.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className={duplicates.length > 0 ? 'border-orange-300 dark:border-orange-700' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Potential Duplicates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className={`h-6 w-6 ${duplicates.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              {duplicates.length}
            </div>
          </CardContent>
        </Card>

        <Card className={requests.length > 0 ? 'border-blue-300 dark:border-blue-700' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Pending Requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <Clock className={`h-6 w-6 ${requests.length > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
              {requests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="duplicates">
            Duplicates {duplicates.length > 0 && <Badge variant="destructive" className="ml-2">{duplicates.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests {requests.length > 0 && <Badge variant="secondary" className="ml-2">{requests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Activity Feed Tab */}
        <TabsContent value="activity">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="mt-0.5">
                          {actionIcons[activity.action] || <Edit3 className="h-4 w-4 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.createdAt)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/person/${activity.entityId}`}>
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.topContributors.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-2">
                    {stats?.topContributors.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤'}</span>
                          <span className="text-sm truncate">{c.first_name || c.email.split('@')[0]}</span>
                        </div>
                        <Badge variant="secondary">{c.action_count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Potential Duplicates
              </CardTitle>
              <CardDescription>
                Review and merge people who might be duplicates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {duplicates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No duplicates detected! Your data is clean.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant={dup.confidence >= 70 ? 'destructive' : 'secondary'}>
                          {dup.confidence}% match
                        </Badge>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setMergeDialog({ open: true, dup })}
                          >
                            <GitMerge className="h-4 w-4 mr-1" />
                            Merge
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded bg-muted/50">
                          <p className="font-medium">{dup.person1.firstName} {dup.person1.lastName}</p>
                          {dup.person1.birthDate && (
                            <p className="text-sm text-muted-foreground">
                              Born: {new Date(dup.person1.birthDate).toLocaleDateString()}
                            </p>
                          )}
                          {dup.person1.birthplace && (
                            <p className="text-sm text-muted-foreground">
                              📍 {dup.person1.birthplace}
                            </p>
                          )}
                        </div>
                        
                        <div className="p-3 rounded bg-muted/50">
                          <p className="font-medium">{dup.person2.firstName} {dup.person2.lastName}</p>
                          {dup.person2.birthDate && (
                            <p className="text-sm text-muted-foreground">
                              Born: {new Date(dup.person2.birthDate).toLocaleDateString()}
                            </p>
                          )}
                          {dup.person2.birthplace && (
                            <p className="text-sm text-muted-foreground">
                              📍 {dup.person2.birthplace}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        {dup.matchReasons.map((reason, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Requests
              </CardTitle>
              <CardDescription>
                Cross-family change requests awaiting your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No pending requests!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{req.request_type.replace('_', ' ')}</Badge>
                          <span className="text-sm text-muted-foreground">
                            from {req.from_family_name}
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          Requested by {req.requester_name}
                        </p>
                        {req.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRequestResponse(req.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleRequestResponse(req.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Merge Dialog */}
      <Dialog open={mergeDialog.open} onOpenChange={(open) => setMergeDialog({ open, dup: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge People</DialogTitle>
            <DialogDescription>
              Choose which person to keep. The other will be merged into them.
            </DialogDescription>
          </DialogHeader>
          
          {mergeDialog.dup && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => handleMerge(mergeDialog.dup!.person1.id, mergeDialog.dup!.person2.id)}
              >
                <span className="font-medium">Keep {mergeDialog.dup.person1.firstName}</span>
                <span className="text-xs text-muted-foreground">
                  Merge {mergeDialog.dup.person2.firstName} into this
                </span>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => handleMerge(mergeDialog.dup!.person2.id, mergeDialog.dup!.person1.id)}
              >
                <span className="font-medium">Keep {mergeDialog.dup.person2.firstName}</span>
                <span className="text-xs text-muted-foreground">
                  Merge {mergeDialog.dup.person1.firstName} into this
                </span>
              </Button>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeDialog({ open: false, dup: null })}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
