import { BOOLEAN, Validate, OPT_DATE } from '../../util/validation';
import { TimeScale } from '../../scale/timeScale';
import { extent } from '../../util/array';
import { isContinuous } from '../../util/value';
import { ChartAxis } from '../chartAxis';
import { clamper } from './numberAxis';

export class TimeAxis extends ChartAxis<TimeScale> {
    static className = 'TimeAxis';
    static type = 'time' as const;

    private datumFormat = '%m/%d/%y, %H:%M:%S';
    private datumFormatter: (date: Date) => string;

    constructor() {
        super(new TimeScale());

        const { scale } = this;
        scale.clamp = true;
        scale.clamper = clamper;
        this.scale = scale;
        this.datumFormatter = scale.tickFormat({
            ticks: this.getTicks(),
            count: this.calculatedTickCount,
            specifier: this.datumFormat,
        });
    }

    @Validate(BOOLEAN)
    private _nice: boolean = true;
    set nice(value: boolean) {
        if (this._nice !== value) {
            this._nice = value;
            if (value && this.scale.nice) {
                this.scale.nice(typeof this.calculatedTickCount === 'number' ? this.calculatedTickCount : undefined);
            }
        }
    }
    get nice(): boolean {
        return this._nice;
    }

    set domain(domain: Date[]) {
        this.setDomain(domain);
    }

    get domain(): Date[] {
        return this.scale.domain;
    }

    @Validate(OPT_DATE)
    private _min?: Date = undefined;
    set min(value: Date | undefined) {
        if (this._min === value) {
            return;
        }

        this._min = value;
    }
    get min(): Date | undefined {
        return this._min;
    }

    @Validate(OPT_DATE)
    private _max?: Date = undefined;
    set max(value: Date | undefined) {
        if (this._max === value) {
            return;
        }

        this._max = value;
    }
    get max(): Date | undefined {
        return this._max;
    }

    private setDomain(domain: Date[], _primaryTickCount?: number) {
        const { scale, nice, min, max, calculatedTickCount } = this;

        if (domain.length > 2) {
            domain = (extent(domain, isContinuous, Number) || [0, 1000]).map((x) => new Date(x));
        }
        domain = [min instanceof Date ? min : domain[0], max instanceof Date ? max : domain[1]];

        this.scale.domain = domain;
        if (nice && scale.nice) {
            scale.nice(typeof calculatedTickCount === 'number' ? calculatedTickCount : undefined);
        }

        this.onLabelFormatChange(this.label.format);
    }

    protected onLabelFormatChange(format?: string) {
        if (format) {
            super.onLabelFormatChange(format);
        } else {
            // For time axis labels to look nice, even if date format wasn't set.
            this.labelFormatter = this.scale.tickFormat({ ticks: this.getTicks(), count: this.calculatedTickCount });
        }
    }

    formatDatum(datum: Date): string {
        return this.datumFormatter(datum);
    }

    protected updateDomain(domain: any[], _isYAxis: boolean, primaryTickCount?: number) {
        // the `primaryTickCount` is used to align the secondary axis tick count with the primary
        this.setDomain(domain, primaryTickCount);
        return primaryTickCount ?? this.scale.ticks(this.calculatedTickCount).length;
    }
}
