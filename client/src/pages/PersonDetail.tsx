import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import type { Person, User } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usePatch, setUsePatch] = useState(true);

  const user: User = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = user.role === 'ADMIN' || user.role === 'EDITOR';
  const canDelete = user.role === 'ADMIN';

  const [formData, setFormData] = useState({
    first_name: '',
    last_name_raw: '',
    current_city: '',
    notes: '',
    birth_date: '',
    death_date: '',
  });

  useEffect(() => {
    loadPerson();
  }, [id]);

  const loadPerson = async () => {
    if (!id) return;
    try {
      const data = await api<Person>('/api/v1/people/' + id);
      setPerson(data);
      setFormData({
        first_name: data.first_name || '',
        last_name_raw: data.last_name_raw || '',
        current_city: data.current_city || '',
        notes: data.notes || '',
        birth_date: data.birth_date || '',
        death_date: data.death_date || '',
      });
    } catch (err) {
      toast.error('Failed to load person');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    try {
      await api<Person>('/api/v1/people/' + id, {
        method: usePatch ? 'PATCH' : 'PUT',
        body: JSON.stringify(formData),
      });
      toast.success('Person updated successfully');
      loadPerson();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      await api('/api/v1/people/' + id, { method: 'DELETE' });
      toast.success('Person deleted');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Person not found</p>
        <Button variant="link" onClick={() => navigate('/')}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {person.first_name} {person.last_name_raw || person.surname}
          </h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{person.family_name}</Badge>
            {person.current_city && (
              <Badge variant="secondary">{person.current_city}</Badge>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Person Details</CardTitle>
          <CardDescription>
            {canEdit ? "Edit the person's information below" : 'View person information'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name_raw">Last Name</Label>
                <Input
                  id="last_name_raw"
                  name="last_name_raw"
                  value={formData.last_name_raw}
                  onChange={handleChange}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_city">Current City</Label>
              <Input
                id="current_city"
                name="current_city"
                value={formData.current_city}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Tunis, Sousse, Sfax..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">Birth Date</Label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="death_date">Death Date</Label>
                <Input
                  id="death_date"
                  name="death_date"
                  type="date"
                  value={formData.death_date}
                  onChange={handleChange}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Additional information..."
              />
            </div>

            {canEdit && (
              <>
                <Separator />
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usePatch"
                    checked={usePatch}
                    onCheckedChange={(checked) => setUsePatch(checked as boolean)}
                  />
                  <Label htmlFor="usePatch" className="text-sm text-muted-foreground">
                    Use PATCH (partial update) instead of PUT (full replace)
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  {canDelete && (
                    <Button type="button" variant="destructive" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
