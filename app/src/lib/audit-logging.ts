import { createClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  event_type?: string;
  table_name?: string;
  record_id?: string;
  old_data?: any;
  new_data?: any;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'AUTHENTICATION' | 'TRADE' | 'USER_PROFILE' | 'SYSTEM' | 'SECURITY' | 'DATA_ACCESS';
  metadata?: any;
}

export interface SecurityEvent {
  type: 'LOGIN_ATTEMPT' | 'PASSWORD_CHANGE' | 'PERMISSION_CHANGE' | 'DATA_ACCESS' | 'SYSTEM_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

export class AuditLoggingService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Log a general audit event
   */
  async logEvent(entry: AuditLogEntry): Promise<string | null> {
    try {
      // Get client information
      const clientInfo = await this.getClientInfo();
      
      const auditEntry = {
        ...entry,
        ip_address: entry.ip_address || clientInfo.ip,
        user_agent: entry.user_agent || clientInfo.userAgent,
        created_at: entry.created_at || new Date().toISOString(),
        severity: entry.severity || this.determineSeverity(entry.action),
        category: entry.category || this.determineCategory(entry.action),
      };

      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntry)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log audit event:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Audit logging failed:', error);
      return null;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(
    action: string,
    userId?: string,
    success: boolean = true,
    metadata?: any
  ): Promise<string | null> {
    const severity = success ? 'LOW' : 'HIGH';
    
    return this.logEvent({
      action,
      user_id: userId,
      entity_type: 'authentication',
      entity_id: userId,
      event_type: 'AUTH',
      severity,
      category: 'AUTHENTICATION',
      metadata: {
        success,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Log trade-related events
   */
  async logTradeEvent(
    action: string,
    tradeId: string,
    userId: string,
    oldData?: any,
    newData?: any,
    metadata?: any
  ): Promise<string | null> {
    return this.logEvent({
      action,
      user_id: userId,
      entity_type: 'trade',
      entity_id: tradeId,
      old_values: oldData,
      new_values: newData,
      event_type: 'TRADE',
      severity: 'MEDIUM',
      category: 'TRADE',
      metadata: {
        trade_id: tradeId,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Log user profile changes
   */
  async logProfileEvent(
    action: string,
    userId: string,
    oldData?: any,
    newData?: any,
    metadata?: any
  ): Promise<string | null> {
    return this.logEvent({
      action,
      user_id: userId,
      entity_type: 'profile',
      entity_id: userId,
      old_values: oldData,
      new_values: newData,
      event_type: 'PROFILE',
      severity: 'MEDIUM',
      category: 'USER_PROFILE',
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Log data access events
   */
  async logDataAccessEvent(
    action: string,
    tableName: string,
    recordId?: string,
    userId?: string,
    metadata?: any
  ): Promise<string | null> {
    return this.logEvent({
      action,
      user_id: userId,
      table_name: tableName,
      record_id: recordId,
      event_type: 'DATA_ACCESS',
      severity: 'LOW',
      category: 'DATA_ACCESS',
      metadata: {
        table_name: tableName,
        record_id: recordId,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: SecurityEvent): Promise<string | null> {
    return this.logEvent({
      action: event.type,
      user_id: event.user_id,
      event_type: 'SECURITY',
      severity: event.severity,
      category: 'SECURITY',
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      metadata: {
        description: event.description,
        timestamp: new Date().toISOString(),
        ...event.metadata,
      },
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    metadata?: any
  ): Promise<string | null> {
    return this.logEvent({
      action,
      event_type: 'SYSTEM',
      severity,
      category: 'SYSTEM',
      metadata: {
        description,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Log failed login attempts
   */
  async logFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<string | null> {
    return this.logSecurityEvent({
      type: 'LOGIN_ATTEMPT',
      severity: 'HIGH',
      description: `Failed login attempt for email: ${email}${reason ? ` - Reason: ${reason}` : ''}`,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        email,
        reason,
        attempt_type: 'failed',
      },
    });
  }

  /**
   * Log successful login
   */
  async logSuccessfulLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    return this.logAuthEvent('LOGIN_SUCCESS', userId, true, {
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log password change
   */
  async logPasswordChange(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    return this.logSecurityEvent({
      type: 'PASSWORD_CHANGE',
      severity: 'HIGH',
      description: 'Password changed successfully',
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(
    targetUserId: string,
    changedByUserId: string,
    oldPermissions: any,
    newPermissions: any,
    reason?: string
  ): Promise<string | null> {
    return this.logSecurityEvent({
      type: 'PERMISSION_CHANGE',
      severity: 'HIGH',
      description: `Permissions changed for user ${targetUserId} by ${changedByUserId}`,
      user_id: changedByUserId,
      metadata: {
        target_user_id: targetUserId,
        old_permissions: oldPermissions,
        new_permissions: newPermissions,
        reason,
      },
    });
  }

  /**
   * Log data export/import events
   */
  async logDataExport(
    userId: string,
    dataType: string,
    recordCount: number,
    metadata?: any
  ): Promise<string | null> {
    return this.logDataAccessEvent(
      'DATA_EXPORT',
      dataType,
      undefined,
      userId,
      {
        record_count: recordCount,
        export_type: dataType,
        ...metadata,
      }
    );
  }

  async logDataImport(
    userId: string,
    dataType: string,
    recordCount: number,
    source: string,
    metadata?: any
  ): Promise<string | null> {
    return this.logDataAccessEvent(
      'DATA_IMPORT',
      dataType,
      undefined,
      userId,
      {
        record_count: recordCount,
        import_type: dataType,
        source,
        ...metadata,
      }
    );
  }

  /**
   * Log API usage
   */
  async logApiUsage(
    endpoint: string,
    method: string,
    userId?: string,
    statusCode: number = 200,
    responseTime?: number,
    metadata?: any
  ): Promise<string | null> {
    const severity = statusCode >= 400 ? 'MEDIUM' : 'LOW';
    
    return this.logEvent({
      action: 'API_REQUEST',
      user_id: userId,
      event_type: 'API',
      severity,
      category: 'SYSTEM',
      metadata: {
        endpoint,
        method,
        status_code: statusCode,
        response_time: responseTime,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    severity?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; count: number }> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<any> {
    try {
      const { data: logs } = await this.getAuditLogs({
        startDate,
        endDate,
        userId,
        limit: 10000, // Get all logs for the period
      });

      const report = {
        period: { start: startDate, end: endDate },
        total_events: logs.length,
        events_by_category: {},
        events_by_severity: {},
        events_by_user: {},
        security_events: [],
        data_access_events: [],
        authentication_events: [],
        trade_events: [],
        system_events: [],
        compliance_score: 0,
        risk_indicators: [],
      };

      // Process logs
      logs.forEach(log => {
        // Count by category
        const category = log.category || 'UNKNOWN';
        report.events_by_category[category] = (report.events_by_category[category] || 0) + 1;

        // Count by severity
        const severity = log.severity || 'LOW';
        report.events_by_severity[severity] = (report.events_by_severity[severity] || 0) + 1;

        // Count by user
        if (log.user_id) {
          report.events_by_user[log.user_id] = (report.events_by_user[log.user_id] || 0) + 1;
        }

        // Categorize events
        if (log.category === 'SECURITY') {
          report.security_events.push(log);
        } else if (log.category === 'DATA_ACCESS') {
          report.data_access_events.push(log);
        } else if (log.category === 'AUTHENTICATION') {
          report.authentication_events.push(log);
        } else if (log.category === 'TRADE') {
          report.trade_events.push(log);
        } else if (log.category === 'SYSTEM') {
          report.system_events.push(log);
        }
      });

      // Calculate compliance score
      const highSeverityEvents = report.events_by_severity['HIGH'] || 0;
      const criticalSeverityEvents = report.events_by_severity['CRITICAL'] || 0;
      const totalEvents = report.total_events;

      report.compliance_score = Math.max(0, 100 - (highSeverityEvents * 5) - (criticalSeverityEvents * 10));

      // Identify risk indicators
      if (criticalSeverityEvents > 0) {
        report.risk_indicators.push('Critical security events detected');
      }
      if (highSeverityEvents > 10) {
        report.risk_indicators.push('High number of high-severity events');
      }
      if ((report.security_events.length / totalEvents) > 0.1) {
        report.risk_indicators.push('High proportion of security events');
      }

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Get client information
   */
  private async getClientInfo(): Promise<{ ip: string; userAgent: string }> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return {
        ip: data.ip || 'unknown',
        userAgent: navigator.userAgent,
      };
    } catch (error) {
      return {
        ip: 'unknown',
        userAgent: navigator.userAgent,
      };
    }
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(action: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalActions = ['LOGIN_FAILED', 'PASSWORD_RESET', 'PERMISSION_CHANGE', 'DATA_DELETE'];
    const highActions = ['LOGIN_SUCCESS', 'LOGOUT', 'PROFILE_UPDATE', 'TRADE_CREATE', 'TRADE_UPDATE'];
    const mediumActions = ['DATA_VIEW', 'DATA_EXPORT', 'SETTINGS_UPDATE'];

    if (criticalActions.some(ca => action.includes(ca))) return 'CRITICAL';
    if (highActions.some(ha => action.includes(ha))) return 'HIGH';
    if (mediumActions.some(ma => action.includes(ma))) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Determine category based on action
   */
  private determineCategory(action: string): 'AUTHENTICATION' | 'TRADE' | 'USER_PROFILE' | 'SYSTEM' | 'SECURITY' | 'DATA_ACCESS' {
    if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('PASSWORD')) {
      return 'AUTHENTICATION';
    }
    if (action.includes('TRADE')) {
      return 'TRADE';
    }
    if (action.includes('PROFILE') || action.includes('SETTINGS')) {
      return 'USER_PROFILE';
    }
    if (action.includes('SECURITY') || action.includes('PERMISSION')) {
      return 'SECURITY';
    }
    if (action.includes('DATA') || action.includes('EXPORT') || action.includes('IMPORT')) {
      return 'DATA_ACCESS';
    }
    return 'SYSTEM';
  }
}

// Export singleton instance
export const auditLogging = new AuditLoggingService();
