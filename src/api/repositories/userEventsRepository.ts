import { Database } from 'bun:sqlite';

export class UserEventsRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  public save(data: {
    userId: string;
    pageName: string;
    pageVariant: string;
    timeSpent_sec: number;
    scrollDepth_perc: number;
    finalAction: string;
    navigationPath: any; // Will be stringified JSON
    sectionViewTimes: any; // Will be stringified JSON
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_events (
          received_at,
          user_id,
          page_name,
          page_variant,
          time_spent_sec,
          scroll_depth_perc,
          final_action,
          navigation_path,
          section_view_times
      ) VALUES (
          datetime('now'),
          @userId,
          @pageName,
          @pageVariant,
          @timeSpent_sec,
          @scrollDepth_perc,
          @finalAction,
          @navigationPath,
          @sectionViewTimes
      )
    `);

    stmt.run({
      "@userId": data.userId,
      "@pageName": data.pageName,
      "@pageVariant": data.pageVariant,
      "@timeSpent_sec": data.timeSpent_sec,
      "@scrollDepth_perc": data.scrollDepth_perc,
      "@finalAction": data.finalAction,
      "@navigationPath": JSON.stringify(data.navigationPath || []),
      "@sectionViewTimes": JSON.stringify(data.sectionViewTimes || {})
    });
  }

  public count(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM user_events').get() as { count: number };
    return result.count;
  }

  public getLatest(limit: number = 10): any[] {
    return this.db.prepare(`SELECT * FROM user_events ORDER BY received_at DESC LIMIT ?`).all(limit);
  }
}
