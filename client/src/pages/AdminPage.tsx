import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, Shield, Edit, Eye, UserPlus, Trash2, 
  Crown, Calendar, Mail, MapPin, Building2, GitBranch,
  Copy, Check, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface FamilyUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  current_city?: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  created_at: string;
  person_id?: string;
}

interface FamilyStats {
  family: {
    name: string;
    created_at: string;
  };
  users: {
    total: number;
    admins: number;
    editors: number;
    viewers: number;
  };
  people: number;
  relationships: number;
}

interface InviteForm {
  email: string;
  firstName: string;
  lastName: string;
  role: 'EDITOR' | 'VIEWER';
  password: string;
}

const ROLE_INFO = {
  ADMIN: {
    label: 'Admin',
    description: 'Full access: can manage users, add/edit/delete people and relationships',
    icon: Crown,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    badgeColor: 'bg-amber-500'
  },
  EDITOR: {
    label: 'Editor',
    description: 'Can add and edit people and relationships, but cannot manage users',
    icon: Edit,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    badgeColor: 'bg-blue-500'
  },
  VIEWER: {
    label: 'Viewer',
    description: 'Read-only access: can view the family tree but cannot make changes',
    icon: Eye,
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    badgeColor: 'bg-slate-500'
  }
};

export default function AdminPage() {
  const [users, setUsers] = useState<FamilyUser[]>([]);
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'VIEWER',
    password: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api<FamilyUser[]>('/api/v1/users'),
        api<FamilyStats>('/api/v1/users/stats')
      ]);
      setUsers(usersRes);
      setStats(statsRes);
    } catch (err) {
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      toast.success(`User role updated to ${newRole}`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    try {
      await api(`/api/v1/users/${userId}`, { method: 'DELETE' });
      toast.success(`${userName} has been removed from the family`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setInviteLoading(true);
    try {
      const result = await api<{ user: { email: string; tempPassword?: string }; instructions: string }>('/api/v1/users/invite', {
        method: 'POST',
        body: JSON.stringify(inviteForm)
      });
      
      setInviteResult({
        email: inviteForm.email,
        password: result.user.tempPassword
      });
      
      toast.success('User created successfully!');
      fetchData();
      
      // Reset form but keep dialog open to show credentials
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        role: 'VIEWER',
        password: ''
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyCredentials = () => {
    if (inviteResult) {
      const text = `Email: ${inviteResult.email}\nPassword: ${inviteResult.password || 'As provided'}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeInviteDialog = () => {
    setInviteOpen(false);
    setInviteResult(null);
    setCopied(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Shield className="h-6 w-6" />
              Access Restricted
            </CardTitle>
            <CardDescription>
              Only family admins can access the user management page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Contact your family admin to request elevated permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Family Admin
          </h1>
          <p className="text-muted-foreground">
            Manage users and permissions for {stats?.family.name || 'your family'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) closeInviteDialog(); else setInviteOpen(true); }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {inviteResult ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-500">
                      <Check className="h-5 w-5" />
                      User Created Successfully
                    </DialogTitle>
                    <DialogDescription>
                      Share these credentials with the new user
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                      <div><span className="text-muted-foreground">Email:</span> {inviteResult.email}</div>
                      <div><span className="text-muted-foreground">Password:</span> {inviteResult.password || 'As provided'}</div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={copyCredentials}>
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Copied!' : 'Copy Credentials'}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeInviteDialog}>Done</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Add New Family Member</DialogTitle>
                    <DialogDescription>
                      Create an account for a new family member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={inviteForm.firstName}
                          onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                          placeholder="Ahmed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={inviteForm.lastName}
                          onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                          placeholder="Ben Ali"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteForm.email}
                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        placeholder="ahmed@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password (optional)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={inviteForm.password}
                        onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                        placeholder="Leave blank to auto-generate"
                      />
                      <p className="text-xs text-muted-foreground">
                        If blank, a temporary password will be generated
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select value={inviteForm.role} onValueChange={(v: 'EDITOR' | 'VIEWER') => setInviteForm({ ...inviteForm, role: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              <span>Viewer - Read-only access</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="EDITOR">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              <span>Editor - Can add/edit data</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                    <Button onClick={handleInvite} disabled={inviteLoading}>
                      {inviteLoading ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Total Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.users.total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.users.admins} admin{stats.users.admins !== 1 && 's'}, {stats.users.editors} editor{stats.users.editors !== 1 && 's'}, {stats.users.viewers} viewer{stats.users.viewers !== 1 && 's'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                People in Tree
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.people}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                Relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.relationships}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Family Since
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(stats.family.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="roles">Role Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Family Members</CardTitle>
              <CardDescription>
                Manage access and permissions for your family tree
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map(user => {
                  const roleInfo = ROLE_INFO[user.role];
                  const RoleIcon = roleInfo.icon;
                  const isCurrentUser = user.id === currentUser.id;
                  
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${isCurrentUser ? 'bg-primary/5 border-primary/20' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.first_name} {user.last_name}
                            {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                            {user.current_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {user.current_city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={roleInfo.badgeColor}>
                          {roleInfo.label}
                        </Badge>
                        
                        {!isCurrentUser && (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={v => handleRoleChange(user.id, v)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="EDITOR">Editor</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {user.first_name} {user.last_name} from the family?
                                    This will revoke their access but won't delete their person record from the tree.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveUser(user.id, `${user.first_name} ${user.last_name}`)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(ROLE_INFO).map(([role, info]) => {
              const Icon = info.icon;
              return (
                <Card key={role} className={info.color}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {info.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{info.description}</p>
                    <div className="mt-4 space-y-2 text-sm">
                      {role === 'ADMIN' && (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Add/remove users</li>
                          <li>Change user roles</li>
                          <li>Add/edit/delete people</li>
                          <li>Manage relationships</li>
                          <li>Delete family data</li>
                        </ul>
                      )}
                      {role === 'EDITOR' && (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Add new people</li>
                          <li>Edit existing profiles</li>
                          <li>Create relationships</li>
                          <li>Cannot delete people</li>
                          <li>Cannot manage users</li>
                        </ul>
                      )}
                      {role === 'VIEWER' && (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>View family tree</li>
                          <li>Browse profiles</li>
                          <li>Search family members</li>
                          <li>Cannot edit anything</li>
                          <li>Perfect for extended family</li>
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
