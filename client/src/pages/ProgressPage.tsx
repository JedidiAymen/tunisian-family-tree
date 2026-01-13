import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Calendar, MapPin, Briefcase, GitBranch, 
  CheckCircle, AlertCircle, ChevronRight, TrendingUp,
  Building2, Users, Map
} from 'lucide-react';

interface ProgressData {
  familyScore: number;
  totalPeople: number;
  totalEdges: number;
  maxGenerationDepth: number;
  progress: {
    identity: { fullName: number; gender: number; photo: number; notes: number; overall: number };
    timeline: { birthDate: number; deathDate: number; marriage: number; overall: number };
    location: { birthplace: number; currentCity: number; locationHistory: number; overall: number };
    occupation: { title: number; sector: number; overall: number };
    tree: { parentsLinked: number; spouseLinked: number; maxGenerationDepth: number; overall: number };
  };
}

interface Task {
  type: string;
  priority: 'high' | 'medium' | 'low';
  personId: string;
  personName: string;
  message: string;
  category: string;
}

interface OccupationStats {
  bySector: { sector: string; count: number; icon: string; color: string }[];
  topOccupations: { occupation_title: string; count: number }[];
  byGeneration: { generation: string; sector: string; count: number }[];
}

interface LocationStats {
  currentCities: { city: string; count: number }[];
  birthplaces: { city: string; count: number }[];
  migrationRoutes: { from_city: string; to_city: string; count: number }[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [occupationStats, setOccupationStats] = useState<OccupationStats | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [progressRes, tasksRes, occupationsRes, locationsRes] = await Promise.all([
        fetch(`${API}/progress/family`, { headers }),
        fetch(`${API}/progress/tasks?limit=15`, { headers }),
        fetch(`${API}/progress/occupations`, { headers }),
        fetch(`${API}/progress/locations`, { headers })
      ]);

      if (progressRes.ok) setProgressData(await progressRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (occupationsRes.ok) setOccupationStats(await occupationsRes.json());
      if (locationsRes.ok) setLocationStats(await locationsRes.json());
    } catch (err) {
      console.error('Failed to fetch progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identity': return <User className="h-4 w-4" />;
      case 'timeline': return <Calendar className="h-4 w-4" />;
      case 'location': return <MapPin className="h-4 w-4" />;
      case 'occupation': return <Briefcase className="h-4 w-4" />;
      case 'tree': return <GitBranch className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
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
          <h1 className="text-3xl font-bold">Family Progress</h1>
          <p className="text-muted-foreground">Track your family tree completeness</p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <TrendingUp className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Family Score Card */}
      {progressData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Family Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-5xl font-bold ${getScoreColor(progressData.familyScore)}`}>
                {progressData.familyScore}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {progressData.familyScore >= 80 ? 'Excellent!' : 
                 progressData.familyScore >= 60 ? 'Good progress' :
                 progressData.familyScore >= 40 ? 'Keep going!' : 'Just started'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total People</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-muted-foreground" />
                {progressData.totalPeople}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-muted-foreground" />
                {progressData.totalEdges}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Generations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-muted-foreground" />
                {progressData.maxGenerationDepth}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Progress Bars</TabsTrigger>
          <TabsTrigger value="tasks">Fix Next</TabsTrigger>
          <TabsTrigger value="occupations">Occupations</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        {/* Progress Bars Tab */}
        <TabsContent value="progress" className="space-y-4">
          {progressData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Identity
                    <Badge variant="outline" className="ml-auto">
                      {progressData.progress.identity.overall}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Full Name</span>
                      <span>{progressData.progress.identity.fullName}%</span>
                    </div>
                    <Progress value={progressData.progress.identity.fullName} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Gender</span>
                      <span>{progressData.progress.identity.gender}%</span>
                    </div>
                    <Progress value={progressData.progress.identity.gender} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Photo</span>
                      <span>{progressData.progress.identity.photo}%</span>
                    </div>
                    <Progress value={progressData.progress.identity.photo} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Notes</span>
                      <span>{progressData.progress.identity.notes}%</span>
                    </div>
                    <Progress value={progressData.progress.identity.notes} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                    <Badge variant="outline" className="ml-auto">
                      {progressData.progress.timeline.overall}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Birth Date</span>
                      <span>{progressData.progress.timeline.birthDate}%</span>
                    </div>
                    <Progress value={progressData.progress.timeline.birthDate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Marriage Events</span>
                      <span>{progressData.progress.timeline.marriage}%</span>
                    </div>
                    <Progress value={progressData.progress.timeline.marriage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                    <Badge variant="outline" className="ml-auto">
                      {progressData.progress.location.overall}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Birthplace</span>
                      <span>{progressData.progress.location.birthplace}%</span>
                    </div>
                    <Progress value={progressData.progress.location.birthplace} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current City</span>
                      <span>{progressData.progress.location.currentCity}%</span>
                    </div>
                    <Progress value={progressData.progress.location.currentCity} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Location History</span>
                      <span>{progressData.progress.location.locationHistory}%</span>
                    </div>
                    <Progress value={progressData.progress.location.locationHistory} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Tree */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Family Tree
                    <Badge variant="outline" className="ml-auto">
                      {progressData.progress.tree.overall}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Parents Linked</span>
                      <span>{progressData.progress.tree.parentsLinked}%</span>
                    </div>
                    <Progress value={progressData.progress.tree.parentsLinked} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Spouse Linked</span>
                      <span>{progressData.progress.tree.spouseLinked}%</span>
                    </div>
                    <Progress value={progressData.progress.tree.spouseLinked} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Occupation */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Occupation
                    <Badge variant="outline" className="ml-auto">
                      {progressData.progress.occupation.overall}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Job Title</span>
                      <span>{progressData.progress.occupation.title}%</span>
                    </div>
                    <Progress value={progressData.progress.occupation.title} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Sector</span>
                      <span>{progressData.progress.occupation.sector}%</span>
                    </div>
                    <Progress value={progressData.progress.occupation.sector} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Fix Next Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Fix Next
              </CardTitle>
              <CardDescription>
                Tasks to improve your family tree completeness
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All caught up! Your family tree is in great shape.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(task.category)}
                        <div>
                          <p className="font-medium">{task.message}</p>
                          <p className="text-sm text-muted-foreground">{task.personName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(task.priority) as any}>
                          {task.priority}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/person/${task.personId}`}>
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupations Tab */}
        <TabsContent value="occupations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>By Sector</CardTitle>
              </CardHeader>
              <CardContent>
                {occupationStats?.bySector.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No occupation data yet</p>
                ) : (
                  <div className="space-y-2">
                    {occupationStats?.bySector.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <span>{s.sector}</span>
                        <Badge variant="secondary">{s.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Occupations</CardTitle>
              </CardHeader>
              <CardContent>
                {occupationStats?.topOccupations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No occupation data yet</p>
                ) : (
                  <div className="space-y-2">
                    {occupationStats?.topOccupations.map((o, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <span>{o.occupation_title}</span>
                        <Badge variant="secondary">{o.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Current Cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locationStats?.currentCities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No location data yet</p>
                ) : (
                  <div className="space-y-2">
                    {locationStats?.currentCities.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <span>{c.city}</span>
                        <Badge variant="secondary">{c.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Birthplaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locationStats?.birthplaces.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No birthplace data yet</p>
                ) : (
                  <div className="space-y-2">
                    {locationStats?.birthplaces.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <span>{b.city}</span>
                        <Badge variant="secondary">{b.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Migration Routes</CardTitle>
                <CardDescription>Most common family migration patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {locationStats?.migrationRoutes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No migration data yet</p>
                ) : (
                  <div className="space-y-2">
                    {locationStats?.migrationRoutes.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <span className="flex items-center gap-2">
                          {r.from_city} 
                          <ChevronRight className="h-4 w-4" /> 
                          {r.to_city}
                        </span>
                        <Badge variant="secondary">{r.count} people</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
