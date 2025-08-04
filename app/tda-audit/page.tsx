'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Define proper interfaces for audit data types
interface AuditData {
  timestamp: string;
  user_id: string;
  tables: Record<string, unknown>;
  data_counts: Record<string, number>;
  issues: string[];
  sample_data?: Record<string, unknown>;
}

interface TestData {
  timestamp: string;
  user_id: string;
  test_results: unknown;
  errors?: string[];
  steps?: string[];
  final_data?: unknown;
}

interface PopulateData {
  timestamp: string;
  user_id: string;
  questions_created: number;
  steps: string[];
  errors?: string[];
  final_data?: unknown;
}

interface FixData {
  timestamp: string;
  user_id: string;
  fixes_applied: string[];
  steps: string[];
  errors?: string[];
}

interface SimpleFixData {
  timestamp: string;
  user_id: string;
  fixes_applied: string[];
  steps: string[];
  errors?: string[];
}

interface EnumUpdateData {
  timestamp: string;
  user_id: string;
  errors?: string[];
  steps: string[];
  final_data?: unknown;
  fixes_applied?: string[];
}

export default function TDAAuditPage() {
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [populateData, setPopulateData] = useState<PopulateData | null>(null);
  const [fixData, setFixData] = useState<FixData | null>(null);
  const [simpleFixData, setSimpleFixData] = useState<SimpleFixData | null>(null);
  const [enumUpdateData, setEnumUpdateData] = useState<EnumUpdateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [populateLoading, setPopulateLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [simpleFixLoading, setSimpleFixLoading] = useState(false);
  const [enumUpdateLoading, setEnumUpdateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tda/database-audit');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAuditData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const runTestAnalysis = async () => {
    setTestLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tda/test-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTestData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTestLoading(false);
    }
  };

  const populateQuestions = async () => {
    setPopulateLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tda/populate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPopulateData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPopulateLoading(false);
    }
  };

  const fixDatabase = async () => {
    setFixLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tda/fix-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFixLoading(false);
    }
  };

  const simpleFix = async () => {
    setSimpleFixLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tda/simple-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      const data = await response.json();
      setSimpleFixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSimpleFixLoading(false);
    }
  };

  const updateTimeframeEnum = async () => {
    setEnumUpdateLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tda/update-timeframe-enum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      const data = await response.json();
      setEnumUpdateData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEnumUpdateLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">TDA Database Audit</h1>
        <div className="space-x-2">
          <Button onClick={runAudit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run Database Audit
          </Button>
          <Button onClick={runTestAnalysis} disabled={testLoading} variant="outline">
            {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Test Analysis
          </Button>
          <Button onClick={populateQuestions} disabled={populateLoading} variant="secondary">
            {populateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Populate Questions
          </Button>
          <Button onClick={simpleFix} disabled={simpleFixLoading} variant="default">
            {simpleFixLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simple Test
          </Button>
          <Button onClick={updateTimeframeEnum} disabled={enumUpdateLoading} variant="outline">
            {enumUpdateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Enum & Add Time Column
          </Button>
          <Button onClick={fixDatabase} disabled={fixLoading} variant="destructive">
            {fixLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Fix Database
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Enum Update Results */}
      {enumUpdateData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeframe Enum Update Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p><strong>Timestamp:</strong> {enumUpdateData.timestamp}</p>
                  <p><strong>User ID:</strong> {enumUpdateData.user_id}</p>
                  <p><strong>Fixes Applied:</strong> {enumUpdateData.fixes_applied?.length || 0}</p>
                  <p><strong>Errors:</strong> {enumUpdateData.errors?.length || 0}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Steps:</h4>
                  <div className="space-y-1">
                    {enumUpdateData.steps?.map((step: string, index: number) => (
                      <div key={index} className="text-sm">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {enumUpdateData.errors && enumUpdateData.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-800">Errors:</h4>
                    <div className="space-y-1">
                      {enumUpdateData.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-800 p-2 bg-red-50 border border-red-200 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {enumUpdateData.fixes_applied && enumUpdateData.fixes_applied.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-800">Fixes Applied:</h4>
                    <div className="space-y-1">
                      {enumUpdateData.fixes_applied.map((fix: string, index: number) => (
                        <div key={index} className="text-sm text-green-800 p-2 bg-green-50 border border-green-200 rounded">
                          {fix}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simple Fix Results */}
      {simpleFixData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Simple Fix Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p><strong>Timestamp:</strong> {simpleFixData.timestamp}</p>
                  <p><strong>User ID:</strong> {simpleFixData.user_id}</p>
                  <p><strong>Fixes Applied:</strong> {simpleFixData.fixes_applied?.length || 0}</p>
                  <p><strong>Errors:</strong> {simpleFixData.errors?.length || 0}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Steps:</h4>
                  <div className="space-y-1">
                    {simpleFixData.steps?.map((step: string, index: number) => (
                      <div key={index} className="text-sm">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {simpleFixData.errors && simpleFixData.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-800">Errors:</h4>
                    <div className="space-y-1">
                      {simpleFixData.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-800 p-2 bg-red-50 border border-red-200 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {simpleFixData.fixes_applied && simpleFixData.fixes_applied.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-800">Fixes Applied:</h4>
                    <div className="space-y-1">
                      {simpleFixData.fixes_applied.map((fix: string, index: number) => (
                        <div key={index} className="text-sm text-green-800 p-2 bg-green-50 border border-green-200 rounded">
                          {fix}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Fix Results */}
      {fixData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Fix Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p><strong>Timestamp:</strong> {fixData.timestamp}</p>
                  <p><strong>User ID:</strong> {fixData.user_id}</p>
                  <p><strong>Fixes Applied:</strong> {fixData.fixes_applied?.length || 0}</p>
                  <p><strong>Errors:</strong> {fixData.errors?.length || 0}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Steps:</h4>
                  <div className="space-y-1">
                    {fixData.steps?.map((step: string, index: number) => (
                      <div key={index} className="text-sm">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {fixData.errors && fixData.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-800">Errors:</h4>
                    <div className="space-y-1">
                      {fixData.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-800 p-2 bg-red-50 border border-red-200 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fixData.fixes_applied && fixData.fixes_applied.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-800">Fixes Applied:</h4>
                    <div className="space-y-1">
                      {fixData.fixes_applied.map((fix: string, index: number) => (
                        <div key={index} className="text-sm text-green-800 p-2 bg-green-50 border border-green-200 rounded">
                          {fix}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Populate Questions Results */}
      {populateData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question Population Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p><strong>Timestamp:</strong> {populateData.timestamp}</p>
                  <p><strong>User ID:</strong> {populateData.user_id}</p>
                  <p><strong>Questions Created:</strong> {populateData.questions_created}</p>
                  <p><strong>Errors:</strong> {populateData.errors?.length || 0}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Steps:</h4>
                  <div className="space-y-1">
                    {populateData.steps?.map((step: string, index: number) => (
                      <div key={index} className="text-sm">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {populateData.errors && populateData.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-800">Errors:</h4>
                    <div className="space-y-1">
                      {populateData.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-800 p-2 bg-red-50 border border-red-200 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {populateData.final_data && (
                  <div>
                    <h4 className="font-semibold mb-2">Final Data:</h4>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                      {JSON.stringify(populateData.final_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {auditData && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Timestamp:</strong> {auditData.timestamp}</p>
                  <p><strong>User ID:</strong> {auditData.user_id}</p>
                </div>
                <div>
                  <p><strong>Issues Found:</strong> {auditData.issues?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Status */}
          <Card>
            <CardHeader>
              <CardTitle>Table Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(auditData.tables || {}).map(([tableName, status]: [string, any]) => (
                  <div key={tableName} className="flex justify-between items-center">
                    <span className="font-mono">{tableName}</span>
                    {status.exists ? (
                      <Badge variant="default">Exists</Badge>
                    ) : (
                      <Badge variant="destructive">Missing</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Counts */}
          <Card>
            <CardHeader>
              <CardTitle>Data Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(auditData.data_counts || {}).map(([tableName, count]: [string, any]) => (
                  <div key={tableName} className="flex justify-between items-center">
                    <span className="font-mono">{tableName}</span>
                    <span className="font-bold">
                      {typeof count === 'number' ? count : 'Error'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {auditData.issues && auditData.issues.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditData.issues.map((issue: string, index: number) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-800">{issue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sample Data */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(auditData.sample_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Analysis Results */}
      {testData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p><strong>Timestamp:</strong> {testData.timestamp}</p>
                  <p><strong>User ID:</strong> {testData.user_id}</p>
                  <p><strong>Errors:</strong> {testData.errors?.length || 0}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Steps:</h4>
                  <div className="space-y-1">
                    {testData.steps?.map((step: string, index: number) => (
                      <div key={index} className="text-sm">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {testData.errors && testData.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-800">Errors:</h4>
                    <div className="space-y-1">
                      {testData.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-800 p-2 bg-red-50 border border-red-200 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Final Data:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(testData.final_data, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 