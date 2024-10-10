import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, View, Dimensions } from "react-native";
import { Button, StyleSheet } from "react-native";

import { Screen } from "@/router/helpers/types";
import { NativeText } from "@/components/Global/NativeComponents";
import InfiniteDatePager from "@/components/Global/InfiniteDatePager";
import HorizontalDatePicker from "./Displays/PapillonType/LessonsDatePicker";
import { useCurrentAccount } from "@/stores/account";
import { useTimetableStore } from "@/stores/timetable";
import { AccountService } from "@/stores/account/types";
import { updateTimetableForWeekInCache } from "@/services/timetable";
import { Page as PapillonTypePage } from "./Displays/PapillonType/Page";
import { LessonsDateModal } from "./LessonsHeader";
import { set, size } from "lodash";
import { dateToEpochWeekNumber } from "@/utils/epochWeekNumber";

import Reanimated, { FadeIn, FadeInDown, FadeInLeft, FadeOut, FadeOutDown, FadeOutLeft, FadeOutRight, FadeOutUp, LinearTransition, ZoomIn, ZoomOut } from "react-native-reanimated";
import { animPapillon } from "@/utils/ui/animations";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PapillonSpinner from "@/components/Global/PapillonSpinner";
import { PressableScale } from "react-native-pressable-scale";
import { Link, useTheme } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import AnimatedNumber from "@/components/Global/AnimatedNumber";
import { LinearGradient } from "expo-linear-gradient";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ArrowLeftToLine, ArrowUp, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CalendarSearch, Clock, Eye, History, Layers, Link2, LinkIcon, ListRestart, Loader, MoreHorizontal, MoreVertical, Plus, Rewind } from "lucide-react-native";
import { PapillonHeaderAction, PapillonHeaderSelector, PapillonHeaderSeparator, PapillonModernHeader } from "@/components/Global/PapillonModernHeader";
import { fetchIcalData } from "@/services/local/ical";
import PapillonPicker from "@/components/Global/PapillonPicker";
import RelativePage from "./Displays/Relative/Page";

const Lessons: Screen<"Lessons"> = ({ route, navigation }) => {
  const account = useCurrentAccount(store => store.account!);
  const timetables = useTimetableStore(store => store.timetables);

  const outsideNav = route.params?.outsideNav;
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  let loadedWeeks = useRef<Set<number>>(new Set());
  let currentlyLoadingWeeks = useRef<Set<number>>(new Set());
  let lastAccountID = useRef<string | null>(null);

  useEffect(() => {
    // add all week numbers in timetables to loadedWeeks
    for (const week in timetables) {
      loadedWeeks.current.add(parseInt(week));
    }
  }, [timetables]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pickerDate, setPickerDate] = React.useState(new Date(today));
  const [selectedDate, setSelectedDate] = React.useState(new Date(today));

  const getWeekFromDate = (date: Date) => {
    const epochWeekNumber = dateToEpochWeekNumber(date);
    return epochWeekNumber;
  };

  const [updatedWeeks, setUpdatedWeeks] = React.useState(new Set<number>());

  useEffect(() => {
    void (async () => {
      const weekNumber = getWeekFromDate(pickerDate);
      await loadTimetableWeek(weekNumber, false);
    })();
  }, [pickerDate, account.instance]);

  useEffect(() => {
    loadTimetableWeek(getWeekFromDate(new Date()), true);
  }, [account.personalization.icalURLs]);

  const [loadingWeeks, setLoadingWeeks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadTimetableWeek = async (weekNumber: number, force = false) => {
    if ((currentlyLoadingWeeks.current.has(weekNumber) || loadedWeeks.current.has(weekNumber)) && !force) {
      return;
    }

    setLoading(true);

    if (force) {
      setLoadingWeeks([...loadingWeeks, weekNumber]);
    }

    try {
      await updateTimetableForWeekInCache(account, weekNumber, force);
      currentlyLoadingWeeks.current.add(weekNumber);
    }
    finally {
      currentlyLoadingWeeks.current.delete(weekNumber);
      loadedWeeks.current.add(weekNumber);
      setUpdatedWeeks(new Set(updatedWeeks).add(weekNumber));
      setLoadingWeeks(loadingWeeks.filter((w) => w !== weekNumber));
      setLoading(false);
    }
  };

  const getAllLessonsForDay = (date: Date) => {
    const week = getWeekFromDate(date);
    const timetable = timetables[week] || [];

    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);

    const day = timetable.filter((lesson) => {
      const lessonDate = new Date(lesson.startTimestamp);
      lessonDate.setHours(0, 0, 0, 0);

      return lessonDate.getTime() === newDate.getTime();
    });

    return day;
  };

  const flatListRef = useRef(null);
  const [data, setData] = useState(() => {
    const today = new Date();
    return Array.from({ length: 100 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 50 + i);
      return date;
    });
  });

  const PageTypes = [
    {
      type: "PapillonType",
      component: PapillonTypePage,
      pretty: "Par défaut"
    },
    {
      type: "Relative",
      component: RelativePage,
      pretty: "Calendrier"
    },
  ];

  const [PageType, setPageType] = useState(0);

  const Page = PageTypes[PageType].component;

  const renderItem = useCallback(({ item: date }) => {
    const weekNumber = getWeekFromDate(date);
    return (
      <View style={{ width: Dimensions.get("window").width }}>
        <Page
          paddingTop={outsideNav ? 80 : insets.top + 56}
          current={date.getTime() === pickerDate.getTime()}
          date={date}
          day={getAllLessonsForDay(date)}
          weekExists={timetables[weekNumber] && timetables[weekNumber].length > 0}
          refreshAction={() => loadTimetableWeek(weekNumber, true)}
          loading={loadingWeeks.includes(weekNumber)}
        />
      </View>
    );
  }, [pickerDate, timetables, loadingWeeks, outsideNav, insets, getAllLessonsForDay, loadTimetableWeek]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newDate = viewableItems[0].item;
      setPickerDate(newDate);
      loadTimetableWeek(getWeekFromDate(newDate), false);
    }
  }, [loadTimetableWeek]);

  const getItemLayout = useCallback((_, index) => ({
    length: Dimensions.get("window").width,
    offset: Dimensions.get("window").width * index,
    index,
  }), []);

  return (
    <View style={{ flex: 1 }}>
      <PapillonModernHeader outsideNav={outsideNav}>
        <PapillonHeaderSelector
          loading={loading}
          onPress={() => setShowDatePicker(true)}
        >
          <Reanimated.View
            layout={animPapillon(LinearTransition)}
          >
            <Reanimated.View
              key={pickerDate.toLocaleDateString("fr-FR", { weekday: "short" })}
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(150)}
            >
              <Reanimated.Text style={[styles.weekPickerText, styles.weekPickerTextIntl,
                {
                  color: theme.colors.text,
                }
              ]}
              >
                {pickerDate.toLocaleDateString("fr-FR", { weekday: "long" })}
              </Reanimated.Text>
            </Reanimated.View>
          </Reanimated.View>


          <AnimatedNumber
            value={pickerDate.getDate().toString()}
            style={[styles.weekPickerText, styles.weekPickerTextNbr,
              {
                color: theme.colors.text,
              }
            ]}
          />

          <Reanimated.Text style={[styles.weekPickerText, styles.weekPickerTextIntl,
            {
              color: theme.colors.text,
            }
          ]}
          layout={animPapillon(LinearTransition)}
          >
            {pickerDate.toLocaleDateString("fr-FR", { month: "long" })}
          </Reanimated.Text>
        </PapillonHeaderSelector>

        <PapillonHeaderSeparator />

        <PapillonPicker
          animated
          direction="right"
          delay={0}
          selected={PageTypes[PageType].pretty}
          data={[
            ...PageTypes.map((page) => page.pretty),
          ]}
          onSelectionChange={(title) => {
            const index = PageTypes.findIndex((page) => page.pretty === title);
            setPageType(index);
          }}
        >
          <PapillonHeaderAction
            icon={<CalendarDays />}
            entering={animPapillon(ZoomIn)}
            exiting={FadeOut.duration(130)}
          />
        </PapillonPicker>

        <PapillonPicker
          animated
          direction="right"
          delay={0}
          data={[
            {
              icon: <CalendarPlus />,
              label: "Importer un iCal",
              onPress: () => {
                navigation.navigate("LessonsImportIcal");
              }
            },
          ]}
        >
          <PapillonHeaderAction
            icon={<MoreVertical />}
            entering={animPapillon(ZoomIn)}
            exiting={FadeOut.duration(130)}
          />
        </PapillonPicker>
      </PapillonModernHeader>

      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.toISOString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={getItemLayout}
        initialScrollIndex={50}
        onEndReached={() => {
          // Charger plus de dates si nécessaire
          const lastDate = data[data.length - 1];
          const newDates = Array.from({ length: 30 }, (_, i) => {
            const date = new Date(lastDate);
            date.setDate(lastDate.getDate() + i + 1);
            return date;
          });
          setData(prevData => [...prevData, ...newDates]);
        }}
        onEndReachedThreshold={0.5}
      />

      <LessonsDateModal
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        currentDate={pickerDate}
        onDateSelect={(date) => {
          const newDate = new Date(date);
          newDate.setHours(0, 0, 0, 0);
          setPickerDate(newDate);
          const index = data.findIndex(d => d.getTime() === newDate.getTime());
          if (index !== -1) {
            flatListRef.current?.scrollToIndex({ index, animated: true });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "absolute",
    top: 0,
    left: 0,
  },

  weekPicker: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 80,
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignSelf: "flex-start",
    overflow: "hidden",
  },

  weekPickerText: {
    zIndex: 10000,
  },

  weekPickerTextIntl: {
    fontSize: 14.5,
    fontFamily: "medium",
    opacity: 0.7,
  },

  weekPickerTextNbr: {
    fontSize: 16.5,
    fontFamily: "semibold",
    marginTop: -1.5,
  },

  weekButton: {
    overflow: "hidden",
    borderRadius: 80,
    height: 38,
    width: 38,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Lessons;