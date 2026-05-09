import { useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";

const PULL_TRIGGER = 82;
const MAX_PULL = 210;

const getFluidPull = distance => {
  const rawPull = Math.max(distance, 0);
  const firstStage = Math.min(rawPull, PULL_TRIGGER);
  const overflow = Math.max(rawPull - PULL_TRIGGER, 0);

  return Math.min(firstStage * 0.72 + overflow * 0.28, MAX_PULL);
};

export default function PullRefreshScrollView({
  children,
  contentContainerStyle,
  onRefresh,
  refreshing = false,
  stretchColor = "#18733b",
  ...props
}) {
  const pullDistance = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const startY = useRef(0);
  const currentPull = useRef(0);
  const isTouchPulling = useRef(false);
  const [showLoader, setShowLoader] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const canRefresh = typeof onRefresh === "function";
  const isBusy = refreshing || showLoader;

  const animatePullTo = value => {
    pullDistance.stopAnimation();
    pullDistance.setValue(value);
  };

  const resetPull = () => {
    Animated.spring(pullDistance, {
      toValue: 0,
      damping: 20,
      stiffness: 180,
      mass: 0.75,
      useNativeDriver: false,
    }).start();

    currentPull.current = 0;
    isTouchPulling.current = false;
    setScrollEnabled(true);
  };

  const finishPull = () => {
    if (isTouchPulling.current && currentPull.current >= PULL_TRIGGER && canRefresh) {
      setShowLoader(true);
      Promise.resolve(onRefresh()).finally(() => {
        setShowLoader(false);
      });
    }

    resetPull();
  };

  const stretchStyle = {
    height: pullDistance.interpolate({
      inputRange: [0, MAX_PULL],
      outputRange: [330, 330 + MAX_PULL],
      extrapolate: "clamp",
    }),
    borderBottomLeftRadius: pullDistance.interpolate({
      inputRange: [0, MAX_PULL],
      outputRange: [0, 42],
      extrapolate: "clamp",
    }),
    borderBottomRightRadius: pullDistance.interpolate({
      inputRange: [0, MAX_PULL],
      outputRange: [0, 42],
      extrapolate: "clamp",
    }),
    opacity: showLoader
      ? 1
      : pullDistance.interpolate({
        inputRange: [0, 5],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
  };

  const contentStyle = {
    flex: 1,
    transform: [{
      translateY: pullDistance.interpolate({
        inputRange: [0, MAX_PULL],
        outputRange: [0, MAX_PULL],
        extrapolate: "clamp",
      }),
    }],
  };

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[styles.stretchBand, { backgroundColor: stretchColor }, stretchStyle]}
      />
      {showLoader ? (
        <View pointerEvents="none" style={styles.loaderBox}>
          <ActivityIndicator color="#ffffff" size="small" />
        </View>
      ) : null}
      <Animated.View style={contentStyle}>
        <Animated.ScrollView
          {...props}
          alwaysBounceVertical={false}
          bounces={false}
          contentContainerStyle={contentContainerStyle}
          nestedScrollEnabled
          onScroll={event => {
            scrollOffset.current = event.nativeEvent.contentOffset.y;
            props.onScroll?.(event);
          }}
          onTouchCancel={finishPull}
          onTouchEnd={finishPull}
          onTouchMove={event => {
            if (!canRefresh || isBusy || scrollOffset.current > 2) return;

            const y = event.nativeEvent.pageY;
            const dragDistance = y - startY.current;

            if (dragDistance <= 0) return;

            const nextPull = getFluidPull(dragDistance);
            isTouchPulling.current = true;
            currentPull.current = nextPull;
            setScrollEnabled(false);
            animatePullTo(nextPull);
          }}
          onTouchStart={event => {
            startY.current = event.nativeEvent.pageY;
            currentPull.current = 0;
            isTouchPulling.current = false;
          }}
          overScrollMode="never"
          scrollEnabled={scrollEnabled && !showLoader}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  stretchBand: {
    left: 0,
    position: "absolute",
    right: 0,
    top: -24,
    zIndex: 0,
  },
  loaderBox: {
    alignItems: "center",
    backgroundColor: "rgba(24, 115, 59, 0.92)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    left: "50%",
    marginLeft: -18,
    position: "absolute",
    top: 14,
    width: 36,
    zIndex: 4,
  },
});
