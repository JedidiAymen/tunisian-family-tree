import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, setToken } from '@/lib/api';
import type { AuthResponse, User } from '@/types';
import { toast } from 'sonner';
import { Info, Crown, Eye } from 'lucide-react';

interface RegisterPageProps {
  onLogin: (user: User) => void;
}

export default function RegisterPage({ onLogin }: RegisterPageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    familyName: '',
    currentCity: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setToken(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join the Tunisian Family Tree network</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Ahmed"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Ben Ali"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input
                id="familyName"
                name="familyName"
                placeholder="Enter your family name"
                value={formData.familyName}
                onChange={handleChange}
                required
              />
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span><strong>New family?</strong> You become the Admin with full control</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-slate-500" />
                      <span><strong>Existing family?</strong> You join as Viewer (admin can upgrade you)</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentCity">Current City</Label>
              <Input
                id="currentCity"
                name="currentCity"
                placeholder="Tunis, Sousse, Sfax..."
                value={formData.currentCity}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="????????????????????????"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
